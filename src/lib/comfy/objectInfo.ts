export type RawInputType = string | string[]

export type RawInputConfig = {
  default?: number | string | boolean | null
  min?: number
  max?: number
  step?: number
  round?: number
  multiline?: boolean
  dynamicPrompts?: boolean
  tooltip?: string
  display_name?: string
  advanced?: boolean
  control_after_generate?: boolean
  forceInput?: boolean
  [key: string]: unknown
}

export type RawInputSlot = [RawInputType] | [RawInputType, RawInputConfig]

export type RawInputGroup = Record<string, RawInputSlot>
export type RawHiddenInputGroup = Record<string, RawInputType>

export type RawObjectInfo = {
  input?: {
    required?: RawInputGroup
    optional?: RawInputGroup
    hidden?: RawHiddenInputGroup
  }
  input_order?: {
    required?: string[]
    optional?: string[]
    hidden?: string[]
  }
  output?: string[]
  output_is_list?: boolean[]
  output_name?: string[]
  output_tooltips?: string[]
  name?: string
  display_name?: string
  description?: string
  python_module?: string
  category?: string
  output_node?: boolean
}

export type RawObjectInfoMap = Record<string, RawObjectInfo>

export type InputGroup = "required" | "optional" | "hidden"

export type InputSlot = {
  name: string
  group: InputGroup
  rawType: RawInputType
  valueType?: string
  options: string[]
  config: RawInputConfig | null
  tooltip?: string
  supportsWidget: boolean
  forceInput: boolean
}

export type WidgetKind = "string" | "number" | "boolean" | "select"

export type WidgetValue = string | number | boolean | null

export type WidgetSpec = {
  kind: WidgetKind
  defaultValue: WidgetValue
  options?: string[]
  multiline?: boolean
}

export type OutputSlot = {
  name: string
  type: string
  isList: boolean
  tooltip?: string
}

export type NodeSchema = {
  name: string
  displayName: string
  description: string
  category: string
  inputs: InputSlot[]
  outputs: OutputSlot[]
  isOutputNode: boolean
  searchValue: string
  pythonModule?: string
}

export type NodeSchemaMap = Record<string, NodeSchema>

export type NodeCatalogEntry = Pick<
  NodeSchema,
  "name" | "displayName" | "description" | "category" | "searchValue"
>

const VALUE_WIDGET_TYPES = new Set(["INT", "FLOAT", "STRING", "BOOLEAN"])

const normalizeInputSlot = (
  name: string,
  rawSlot: RawInputSlot,
  group: InputGroup,
): InputSlot => {
  const [rawType, config] = rawSlot
  const options = Array.isArray(rawType) ? rawType : []
  const valueType = typeof rawType === "string" ? rawType : undefined
  const supportsWidget =
    Array.isArray(rawType) ||
    (valueType ? VALUE_WIDGET_TYPES.has(valueType) : false)
  const tooltip =
    typeof config?.tooltip === "string" ? config.tooltip : undefined
  const forceInput = Boolean(config?.forceInput)

  return {
    name,
    group,
    rawType,
    valueType,
    options,
    config: config ?? null,
    tooltip,
    supportsWidget,
    forceInput,
  }
}

const normalizeHiddenInput = (
  name: string,
  rawType: RawInputType,
): InputSlot => {
  const options = Array.isArray(rawType) ? rawType : []
  const valueType = typeof rawType === "string" ? rawType : undefined

  return {
    name,
    group: "hidden",
    rawType,
    valueType,
    options,
    config: null,
    supportsWidget: false,
    forceInput: true,
  }
}

const orderedKeys = (keys: string[], order?: string[]) => {
  if (!order || order.length === 0) {
    return keys
  }
  const known = new Set(keys)
  const ordered = order.filter((key) => known.has(key))
  if (ordered.length === keys.length) {
    return ordered
  }
  const remaining = keys.filter((key) => !ordered.includes(key))
  return [...ordered, ...remaining]
}

const normalizeInputs = (raw: RawObjectInfo): InputSlot[] => {
  const input = raw.input
  if (!input) {
    return []
  }

  const inputs: InputSlot[] = []
  const order = raw.input_order

  const required = input.required ?? {}
  const requiredKeys = orderedKeys(Object.keys(required), order?.required)
  for (const name of requiredKeys) {
    inputs.push(normalizeInputSlot(name, required[name], "required"))
  }

  const optional = input.optional ?? {}
  const optionalKeys = orderedKeys(Object.keys(optional), order?.optional)
  for (const name of optionalKeys) {
    inputs.push(normalizeInputSlot(name, optional[name], "optional"))
  }

  const hidden = input.hidden ?? {}
  const hiddenKeys = orderedKeys(Object.keys(hidden), order?.hidden)
  for (const name of hiddenKeys) {
    inputs.push(normalizeHiddenInput(name, hidden[name]))
  }

  return inputs
}

const normalizeOutputs = (raw: RawObjectInfo): OutputSlot[] => {
  const outputTypes = raw.output ?? []
  const outputNames = raw.output_name ?? []
  const outputIsList = raw.output_is_list ?? []
  const outputTooltips = raw.output_tooltips ?? []

  return outputTypes.map((type, index) => ({
    name: outputNames[index] ?? type,
    type,
    isList: outputIsList[index] ?? false,
    tooltip: outputTooltips[index],
  }))
}

const resolveSelectDefault = (slot: InputSlot): string => {
  const defaultValue = slot.config?.default
  if (typeof defaultValue === "string" && slot.options.includes(defaultValue)) {
    return defaultValue
  }
  return slot.options[0] ?? ""
}

const resolveNumberDefault = (slot: InputSlot): number => {
  const defaultValue = slot.config?.default
  if (typeof defaultValue === "number") {
    return defaultValue
  }
  return 0
}

const resolveStringDefault = (slot: InputSlot): string => {
  const defaultValue = slot.config?.default
  if (typeof defaultValue === "string") {
    return defaultValue
  }
  return ""
}

const resolveBooleanDefault = (slot: InputSlot): boolean => {
  const defaultValue = slot.config?.default
  if (typeof defaultValue === "boolean") {
    return defaultValue
  }
  return false
}

export const getWidgetSpec = (slot: InputSlot): WidgetSpec | null => {
  if (!slot.supportsWidget || slot.forceInput) {
    return null
  }

  if (slot.options.length > 0) {
    return {
      kind: "select",
      defaultValue: resolveSelectDefault(slot),
      options: slot.options,
    }
  }

  switch (slot.valueType) {
    case "STRING":
      return {
        kind: "string",
        defaultValue: resolveStringDefault(slot),
        multiline: Boolean(slot.config?.multiline),
      }
    case "INT":
    case "FLOAT":
      return {
        kind: "number",
        defaultValue: resolveNumberDefault(slot),
      }
    case "BOOLEAN":
      return {
        kind: "boolean",
        defaultValue: resolveBooleanDefault(slot),
      }
    default:
      return null
  }
}

export const normalizeObjectInfo = (raw: RawObjectInfoMap): NodeSchemaMap => {
  const result: NodeSchemaMap = {}

  for (const [key, node] of Object.entries(raw)) {
    const name = node.name?.trim() || key
    const displayName = node.display_name?.trim() || name
    const description = node.description?.trim() || ""
    const category = node.category?.trim() || ""
    const searchValue = [displayName, name, description, category]
      .filter(Boolean)
      .join(" ")

    result[name] = {
      name,
      displayName,
      description,
      category,
      inputs: normalizeInputs(node),
      outputs: normalizeOutputs(node),
      isOutputNode: Boolean(node.output_node),
      searchValue,
      pythonModule: node.python_module,
    }
  }

  return result
}

export const buildNodeCatalog = (
  schemaMap: NodeSchemaMap,
): NodeCatalogEntry[] => {
  return Object.values(schemaMap).map((node) => ({
    name: node.name,
    displayName: node.displayName,
    description: node.description,
    category: node.category,
    searchValue: node.searchValue,
  }))
}
