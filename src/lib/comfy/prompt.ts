import {
  getWidgetSpec,
  type InputSlot,
  type NodeSchemaMap,
  type WidgetValue,
} from "@/lib/comfy/objectInfo"

type GraphNodeLike = {
  id: string
  data?: {
    nodeType?: string
    widgetValues?: Record<string, WidgetValue>
  }
}

type GraphEdgeLike = {
  source?: string | null
  target?: string | null
  sourceHandle?: string | null
  targetHandle?: string | null
}

type PromptConnection = [string, number]

type PromptInputValue = WidgetValue | PromptConnection | PromptConnection[]

export type PromptNode = {
  class_type: string
  inputs: Record<string, PromptInputValue>
}

export type PromptMap = Record<string, PromptNode>

export type PromptBuildResult = {
  prompt: PromptMap
  errors: string[]
  warnings: string[]
}

const parseHandleSlotName = (
  handleId: string | null | undefined,
  prefix: "in-" | "out-",
) => {
  if (!handleId?.startsWith(prefix)) {
    return null
  }
  const slotName = handleId.slice(prefix.length)
  return slotName.length > 0 ? slotName : null
}

const resolveNumberValue = (value: WidgetValue, isInteger: boolean) => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined
    }
    return isInteger ? Math.trunc(value) : value
  }

  if (typeof value === "string") {
    if (value.trim() === "") {
      return undefined
    }
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return undefined
    }
    return isInteger ? Math.trunc(parsed) : parsed
  }

  return undefined
}

const resolveWidgetValue = (
  slot: InputSlot,
  rawValue: WidgetValue | undefined,
  fallbackValue: WidgetValue | undefined,
) => {
  const value = rawValue ?? fallbackValue
  if (value === null || value === undefined) {
    return undefined
  }

  if (slot.options.length > 0 || slot.valueType === "STRING") {
    return typeof value === "string" ? value : String(value)
  }

  if (slot.valueType === "BOOLEAN") {
    if (typeof value === "boolean") {
      return value
    }
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true
      }
      if (value.toLowerCase() === "false") {
        return false
      }
    }
    return undefined
  }

  if (slot.valueType === "INT") {
    return resolveNumberValue(value, true)
  }

  if (slot.valueType === "FLOAT") {
    return resolveNumberValue(value, false)
  }

  return value
}

const isPromptConnection = (
  value: PromptInputValue,
): value is PromptConnection =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "string" &&
  typeof value[1] === "number"

const isPromptConnectionList = (
  value: PromptInputValue,
): value is PromptConnection[] =>
  Array.isArray(value) && value.length > 0 && value.every(isPromptConnection)

const mergePromptConnection = (
  existing: PromptInputValue | undefined,
  connection: PromptConnection,
) => {
  if (!existing) {
    return connection
  }

  if (isPromptConnection(existing)) {
    return [existing, connection]
  }

  if (isPromptConnectionList(existing)) {
    return [...existing, connection]
  }

  return connection
}

export const buildPromptFromGraph = <
  NodeType extends GraphNodeLike,
  EdgeType extends GraphEdgeLike,
>(
  nodes: NodeType[],
  edges: EdgeType[],
  nodeSchemas: NodeSchemaMap,
): PromptBuildResult => {
  const errors: string[] = []
  const warnings: string[] = []
  const prompt: PromptMap = {}
  const nodeById = new Map<string, GraphNodeLike>()
  const schemaWarningKeys = new Set<string>()

  const pushWarning = (message: string, dedupeKey?: string) => {
    if (dedupeKey) {
      if (schemaWarningKeys.has(dedupeKey)) {
        return
      }
      schemaWarningKeys.add(dedupeKey)
    }
    warnings.push(message)
  }

  for (const node of nodes) {
    nodeById.set(node.id, node)
    const nodeType = node.data?.nodeType
    if (!nodeType) {
      pushWarning(
        `Node ${node.id} is missing a type.`,
        `missing-type-${node.id}`,
      )
      continue
    }

    const schema = nodeSchemas[nodeType]
    const widgetValues = node.data?.widgetValues ?? {}
    const inputs: Record<string, PromptInputValue> = {}

    if (schema) {
      for (const slot of schema.inputs) {
        if (slot.group === "hidden") {
          continue
        }
        if (!slot.supportsWidget || slot.forceInput) {
          continue
        }
        const rawValue = widgetValues[slot.name]
        const fallbackValue =
          rawValue === undefined ? getWidgetSpec(slot)?.defaultValue : undefined
        const resolved = resolveWidgetValue(slot, rawValue, fallbackValue)
        if (resolved !== undefined) {
          inputs[slot.name] = resolved
        }
      }
    } else {
      pushWarning(
        `Missing schema for ${nodeType} (${node.id}).`,
        `missing-schema-${node.id}`,
      )
      for (const [key, value] of Object.entries(widgetValues)) {
        if (value !== null && value !== undefined) {
          inputs[key] = value
        }
      }
    }

    prompt[node.id] = { class_type: nodeType, inputs }
  }

  for (const edge of edges) {
    if (!edge.source || !edge.target) {
      continue
    }

    const sourceSlotName = parseHandleSlotName(edge.sourceHandle, "out-")
    const targetSlotName = parseHandleSlotName(edge.targetHandle, "in-")
    if (!sourceSlotName || !targetSlotName) {
      continue
    }

    const sourceNode = nodeById.get(edge.source)
    const targetNode = nodeById.get(edge.target)
    if (!sourceNode || !targetNode) {
      continue
    }

    const sourceType = sourceNode.data?.nodeType
    if (!sourceType) {
      continue
    }

    const sourceSchema = nodeSchemas[sourceType]
    if (!sourceSchema) {
      pushWarning(
        `Missing schema for ${sourceType} (${sourceNode.id}).`,
        `missing-schema-${sourceNode.id}`,
      )
      continue
    }

    const outputIndex = sourceSchema.outputs.findIndex(
      (slot) => slot.name === sourceSlotName,
    )
    if (outputIndex < 0) {
      pushWarning(
        `Unknown output ${sourceSlotName} on ${sourceType} (${sourceNode.id}).`,
      )
      continue
    }

    const targetPrompt = prompt[targetNode.id]
    if (!targetPrompt) {
      continue
    }

    const connection: PromptConnection = [sourceNode.id, outputIndex]
    targetPrompt.inputs[targetSlotName] = mergePromptConnection(
      targetPrompt.inputs[targetSlotName],
      connection,
    )
  }

  for (const node of nodes) {
    const nodeType = node.data?.nodeType
    if (!nodeType) {
      continue
    }
    const schema = nodeSchemas[nodeType]
    if (!schema) {
      continue
    }

    const promptNode = prompt[node.id]
    if (!promptNode) {
      continue
    }

    for (const slot of schema.inputs) {
      if (slot.group !== "required") {
        continue
      }
      if (!(slot.name in promptNode.inputs)) {
        errors.push(
          `Missing required input ${slot.name} on ${schema.displayName} (${node.id}).`,
        )
      }
    }
  }

  return { prompt, errors, warnings }
}
