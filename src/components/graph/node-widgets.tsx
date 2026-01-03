import type * as React from "react"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  CONTROL_AFTER_GENERATE_OPTIONS,
  isControlAfterGenerateEnabled,
  normalizeControlValue,
  type WidgetControlValue,
} from "@/lib/comfy/control-after-generate"
import type { InputSlot, WidgetSpec, WidgetValue } from "@/lib/comfy/objectInfo"

type WidgetChangeHandler = (slotName: string, value: WidgetValue) => void
type ControlWidgetChangeHandler = (
  slotName: string,
  value: WidgetControlValue,
) => void

type WidgetRenderParams = {
  slot: InputSlot
  widgetSpec: WidgetSpec | null
  value: WidgetValue | undefined
  onChange: WidgetChangeHandler
}

type ControlWidgetRenderParams = {
  slot: InputSlot
  widgetSpec: WidgetSpec | null
  value: WidgetControlValue | undefined
  onChange: ControlWidgetChangeHandler
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

const renderSelectWidget = ({
  slot,
  widgetSpec,
  value,
  onChange,
}: WidgetRenderParams): React.ReactNode => {
  const options = widgetSpec?.options ?? []
  const selectedValue =
    typeof value === "string"
      ? value
      : typeof widgetSpec?.defaultValue === "string"
        ? widgetSpec.defaultValue
        : (options[0] ?? "")

  return (
    <Select
      className="nodrag text-xs leading-5 text-slate-900"
      value={selectedValue}
      onChange={(event) => onChange(slot.name, event.target.value)}
    >
      {options.map((option) => (
        <option key={`${slot.name}-${option}`} value={option}>
          {option}
        </option>
      ))}
    </Select>
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
    case "select":
      return renderSelectWidget({ ...params, widgetSpec })
    default:
      return null
  }
}

export const renderControlAfterGenerateWidget = ({
  slot,
  widgetSpec,
  value,
  onChange,
}: ControlWidgetRenderParams): React.ReactNode | null => {
  if (!widgetSpec || !isControlAfterGenerateEnabled(slot)) {
    return null
  }

  if (widgetSpec.kind !== "number" && widgetSpec.kind !== "select") {
    return null
  }

  const selectedValue = normalizeControlValue(value)

  return (
    <Select
      className="nodrag text-xs leading-5 text-slate-700"
      aria-label="Control after generate"
      title="Control after generate"
      value={selectedValue}
      onChange={(event) => {
        const nextValue = event.target.value as WidgetControlValue
        if (!CONTROL_AFTER_GENERATE_OPTIONS.includes(nextValue)) {
          return
        }
        onChange(slot.name, nextValue)
      }}
    >
      {CONTROL_AFTER_GENERATE_OPTIONS.map((option) => (
        <option key={`${slot.name}-control-${option}`} value={option}>
          {option}
        </option>
      ))}
    </Select>
  )
}
