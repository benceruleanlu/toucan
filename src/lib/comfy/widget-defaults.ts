import {
  getWidgetSpec,
  type NodeSchema,
  type WidgetValue,
} from "@/lib/comfy/objectInfo"

const buildWidgetDefaults = (
  schema?: NodeSchema,
): Record<string, WidgetValue> => {
  if (!schema) {
    return {}
  }

  const values: Record<string, WidgetValue> = {}
  for (const input of schema.inputs) {
    const spec = getWidgetSpec(input)
    if (!spec) {
      continue
    }
    values[input.name] = spec.defaultValue
  }
  return values
}

export { buildWidgetDefaults }
