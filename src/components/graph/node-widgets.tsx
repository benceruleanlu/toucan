import * as React from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { InputSlot, WidgetSpec, WidgetValue } from "@/lib/comfy/objectInfo"

type WidgetChangeHandler = (slotName: string, value: WidgetValue) => void

type WidgetRenderParams = {
  slot: InputSlot
  widgetSpec: WidgetSpec | null
  value: WidgetValue | undefined
  onChange: WidgetChangeHandler
}

const renderStringWidget = ({
  slot,
  widgetSpec,
  value,
  onChange,
}: WidgetRenderParams): React.ReactNode => {
  const stringValue =
    typeof value === "string"
      ? value
      : typeof widgetSpec?.defaultValue === "string"
        ? widgetSpec.defaultValue
        : ""

  return (
    <Textarea
      className="nodrag text-xs leading-5 text-slate-900"
      value={stringValue}
      onChange={(event) => onChange(slot.name, event.target.value)}
    />
  )
}

const renderNumberWidget = ({
  slot,
  widgetSpec,
  value,
  onChange,
}: WidgetRenderParams): React.ReactNode => {
  const isInteger = slot.valueType === "INT"
  const min = typeof slot.config?.min === "number" ? slot.config.min : undefined
  const max = typeof slot.config?.max === "number" ? slot.config.max : undefined
  const step =
    typeof slot.config?.step === "number" ? slot.config.step : undefined
  const defaultNumber =
    typeof widgetSpec?.defaultValue === "number" ? widgetSpec.defaultValue : 0
  const numberValue =
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : value === null
          ? ""
          : String(defaultNumber)
  const numberPattern = isInteger ? /^-?\d*$/ : /^-?\d*(\.\d*)?$/

  return (
    <Input
      className="nodrag text-xs leading-5 text-slate-900"
      inputMode={isInteger ? "numeric" : "decimal"}
      min={min}
      max={max}
      step={step}
      value={numberValue}
      onChange={(event) => {
        const rawValue = event.target.value
        if (!numberPattern.test(rawValue)) {
          return
        }
        if (
          rawValue === "" ||
          rawValue === "-" ||
          rawValue === "." ||
          rawValue === "-."
        ) {
          onChange(slot.name, rawValue)
          return
        }
        const parsed = Number(rawValue)
        if (!Number.isFinite(parsed)) {
          return
        }
        if (isInteger) {
          onChange(slot.name, Math.trunc(parsed))
          return
        }
        onChange(slot.name, parsed)
      }}
    />
  )
}

const renderBooleanWidget = ({
  slot,
  widgetSpec,
  value,
  onChange,
}: WidgetRenderParams): React.ReactNode => {
  const booleanValue =
    typeof value === "boolean"
      ? value
      : typeof widgetSpec?.defaultValue === "boolean"
        ? widgetSpec.defaultValue
        : false

  return (
    <Switch
      className="nodrag"
      checked={booleanValue}
      onCheckedChange={(checked) => onChange(slot.name, checked)}
    />
  )
}

export const renderNodeWidget = ({
  widgetSpec,
  ...params
}: WidgetRenderParams): React.ReactNode | null => {
  if (!widgetSpec) {
    return null
  }

  switch (widgetSpec.kind) {
    case "string":
      return renderStringWidget({ ...params, widgetSpec })
    case "number":
      return renderNumberWidget({ ...params, widgetSpec })
    case "boolean":
      return renderBooleanWidget({ ...params, widgetSpec })
    default:
      return null
  }
}
