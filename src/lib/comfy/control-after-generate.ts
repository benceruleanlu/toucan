import {
  getWidgetSpec,
  type InputSlot,
  type NodeSchema,
  type NodeSchemaMap,
  type WidgetSpec,
  type WidgetValue,
} from "@/lib/comfy/objectInfo"

const CONTROL_AFTER_GENERATE_OPTIONS = [
  "fixed",
  "increment",
  "decrement",
  "randomize",
] as const

export type WidgetControlValue = (typeof CONTROL_AFTER_GENERATE_OPTIONS)[number]

export type WidgetControlMap = Record<string, WidgetControlValue>

export type ControlAfterGenerateMode = "before" | "after"

const DEFAULT_CONTROL_VALUE: WidgetControlValue = "randomize"
const CONTROL_FALLBACK_NAMES = new Set(["seed", "noise_seed"])
const MAX_RANDOM_RANGE = 1125899906842624

const normalizeControlValue = (
  value: WidgetControlValue | null | undefined,
): WidgetControlValue =>
  CONTROL_AFTER_GENERATE_OPTIONS.includes(value as WidgetControlValue)
    ? (value as WidgetControlValue)
    : DEFAULT_CONTROL_VALUE

const isSupportedControlWidget = (widgetSpec: WidgetSpec) =>
  widgetSpec.kind === "number" || widgetSpec.kind === "select"

export const isControlAfterGenerateEnabled = (slot: InputSlot): boolean => {
  if (!slot.supportsWidget || slot.forceInput) {
    return false
  }

  const controlSetting = slot.config?.control_after_generate
  if (controlSetting === true || typeof controlSetting === "string") {
    return true
  }

  return CONTROL_FALLBACK_NAMES.has(slot.name)
}

export const buildControlDefaults = (schema?: NodeSchema): WidgetControlMap => {
  if (!schema) {
    return {}
  }

  const values: WidgetControlMap = {}
  for (const input of schema.inputs) {
    if (!isControlAfterGenerateEnabled(input)) {
      continue
    }
    const spec = getWidgetSpec(input)
    if (!spec || !isSupportedControlWidget(spec)) {
      continue
    }
    values[input.name] = DEFAULT_CONTROL_VALUE
  }
  return values
}

type ControlNodeLike = {
  id: string
  data?: {
    nodeType?: string
    widgetValues?: Record<string, WidgetValue>
    widgetControlValues?: WidgetControlMap
  }
}

type ApplyControlAfterGenerateArgs<TNode extends ControlNodeLike> = {
  nodes: TNode[]
  nodeSchemas: NodeSchemaMap
  mode: ControlAfterGenerateMode
  executedControls?: Set<string>
}

type ApplyControlAfterGenerateResult<TNode extends ControlNodeLike> = {
  nodes: TNode[]
  didMutate: boolean
}

const resolveNumericValue = (
  value: WidgetValue | undefined,
  fallback: number,
  isInteger: boolean,
) => {
  let resolved = fallback
  if (typeof value === "number" && Number.isFinite(value)) {
    resolved = value
  } else if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      resolved = parsed
    }
  }

  return isInteger ? Math.trunc(resolved) : resolved
}

const resolveNumberBounds = (
  slot: InputSlot,
  fallback: number,
  step: number,
) => {
  let min =
    typeof slot.config?.min === "number" && Number.isFinite(slot.config.min)
      ? slot.config.min
      : fallback
  let max =
    typeof slot.config?.max === "number" && Number.isFinite(slot.config.max)
      ? slot.config.max
      : min + step

  if (max < min) {
    const swap = max
    max = min
    min = swap
  }

  min = Math.max(-MAX_RANDOM_RANGE, min)
  max = Math.min(MAX_RANDOM_RANGE, max)

  if (max < min) {
    max = min
  }

  return { min, max }
}

const resolveNumberStep = (slot: InputSlot) => {
  const step =
    typeof slot.config?.step === "number" && Number.isFinite(slot.config.step)
      ? slot.config.step
      : 1
  return step === 0 ? 1 : Math.abs(step)
}

const applyNumberControl = (
  controlValue: WidgetControlValue,
  slot: InputSlot,
  widgetSpec: WidgetSpec,
  rawValue: WidgetValue | undefined,
): number | undefined => {
  if (controlValue === "fixed") {
    return undefined
  }

  const isInteger = slot.valueType === "INT"
  const defaultValue =
    typeof widgetSpec.defaultValue === "number" ? widgetSpec.defaultValue : 0
  const step = resolveNumberStep(slot)
  const { min, max } = resolveNumberBounds(slot, defaultValue, step)
  const current = resolveNumericValue(rawValue, defaultValue, isInteger)

  let next = current
  switch (controlValue) {
    case "increment":
      next = current + step
      break
    case "decrement":
      next = current - step
      break
    case "randomize": {
      const range = (max - min) / step
      const roll = range > 0 ? Math.floor(Math.random() * range) : 0
      next = roll * step + min
      break
    }
    default:
      break
  }

  if (next < min) {
    next = min
  }
  if (next > max) {
    next = max
  }

  return isInteger ? Math.trunc(next) : next
}

const applySelectControl = (
  controlValue: WidgetControlValue,
  widgetSpec: WidgetSpec,
  rawValue: WidgetValue | undefined,
): string | undefined => {
  if (controlValue === "fixed") {
    return undefined
  }

  const options = widgetSpec.options ?? []
  if (options.length === 0) {
    return undefined
  }

  const fallback =
    typeof widgetSpec.defaultValue === "string"
      ? widgetSpec.defaultValue
      : options[0]
  const current = typeof rawValue === "string" ? rawValue : fallback
  let index = options.indexOf(current)
  if (index < 0) {
    index = 0
  }

  switch (controlValue) {
    case "increment":
      index += 1
      break
    case "decrement":
      index -= 1
      break
    case "randomize":
      index = Math.floor(Math.random() * options.length)
      break
    default:
      break
  }

  index = Math.max(0, Math.min(options.length - 1, index))
  return options[index]
}

export const applyControlAfterGenerate = <TNode extends ControlNodeLike>({
  nodes,
  nodeSchemas,
  mode,
  executedControls,
}: ApplyControlAfterGenerateArgs<TNode>): ApplyControlAfterGenerateResult<TNode> => {
  // ComfyUI mutates control_after_generate inputs to avoid repeated cache hits.
  let nextNodes: TNode[] | null = null

  nodes.forEach((node, index) => {
    const nodeType = node.data?.nodeType
    if (!nodeType) {
      return
    }

    const schema = nodeSchemas[nodeType]
    if (!schema) {
      return
    }

    const widgetValues = node.data?.widgetValues ?? {}
    const controlValues = node.data?.widgetControlValues ?? {}
    let nextWidgetValues: Record<string, WidgetValue> | null = null

    const setWidgetValue = (slotName: string, value: WidgetValue) => {
      if (!nextWidgetValues) {
        nextWidgetValues = { ...widgetValues }
      }
      nextWidgetValues[slotName] = value
    }

    for (const slot of schema.inputs) {
      if (!isControlAfterGenerateEnabled(slot)) {
        continue
      }

      const controlKey = `${node.id}:${slot.name}`
      if (
        mode === "before" &&
        executedControls &&
        !executedControls.has(controlKey)
      ) {
        executedControls.add(controlKey)
        continue
      }

      const widgetSpec = getWidgetSpec(slot)
      if (!widgetSpec || !isSupportedControlWidget(widgetSpec)) {
        continue
      }

      const controlValue = normalizeControlValue(controlValues[slot.name])
      const rawValue = widgetValues[slot.name]

      let nextValue: WidgetValue | undefined
      if (widgetSpec.kind === "number") {
        nextValue = applyNumberControl(controlValue, slot, widgetSpec, rawValue)
      } else if (widgetSpec.kind === "select") {
        nextValue = applySelectControl(controlValue, widgetSpec, rawValue)
      }

      if (nextValue !== undefined && !Object.is(nextValue, rawValue)) {
        setWidgetValue(slot.name, nextValue)
      }
    }

    if (nextWidgetValues) {
      const nextData = { ...node.data, widgetValues: nextWidgetValues }
      const nextNode = { ...node, data: nextData }
      if (!nextNodes) {
        nextNodes = nodes.slice()
      }
      nextNodes[index] = nextNode
    }
  })

  return { nodes: nextNodes ?? nodes, didMutate: Boolean(nextNodes) }
}

export {
  CONTROL_AFTER_GENERATE_OPTIONS,
  DEFAULT_CONTROL_VALUE,
  normalizeControlValue,
}
