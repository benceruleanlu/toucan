"use client"

import {
  Handle,
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react"
import * as React from "react"
import { HANDLE_OFFSET } from "@/components/graph/constants"
import { renderNodeWidget } from "@/components/graph/node-widgets"
import {
  getWidgetSpec,
  type NodeSchemaMap,
  type WidgetValue,
} from "@/lib/comfy/objectInfo"

export type ComfyNodeData = {
  label: string
  nodeType: string
  widgetValues: Record<string, WidgetValue>
}

export type ComfyFlowNode = Node<ComfyNodeData, "comfy">
export type CanvasNode = ComfyFlowNode

export const NodeSchemaContext = React.createContext<NodeSchemaMap>({})

export function ComfyNode({ data, id }: NodeProps<ComfyFlowNode>) {
  const { updateNodeData } = useReactFlow<CanvasNode>()
  const nodeSchemas = React.useContext(NodeSchemaContext)
  const schema = nodeSchemas[data.nodeType]
  const inputSlots =
    schema?.inputs.filter((slot) => slot.group !== "hidden") ?? []
  const outputSlots = schema?.outputs ?? []
  const widgetValues = data.widgetValues ?? {}

  const handleWidgetChange = React.useCallback(
    (slotName: string, value: WidgetValue) => {
      updateNodeData(id, (node) => ({
        widgetValues: {
          ...(node.data.widgetValues ?? {}),
          [slotName]: value,
        },
      }))
    },
    [id, updateNodeData],
  )

  const inputSlotsWithWidgets = []
  const inputSlotsWithoutWidgets = []

  for (const slot of inputSlots) {
    const widgetSpec = getWidgetSpec(slot)
    const displayName = (() => {
      if (typeof slot.config?.display_name !== "string") {
        return slot.name
      }
      const trimmed = slot.config.display_name.trim()
      return trimmed.length > 0 ? trimmed : slot.name
    })()
    const widget = renderNodeWidget({
      slot,
      widgetSpec,
      value: widgetValues[slot.name],
      onChange: handleWidgetChange,
    })

    if (widget) {
      inputSlotsWithWidgets.push({ slot, displayName, widget })
    } else {
      inputSlotsWithoutWidgets.push({ slot, displayName })
    }
  }

  return (
    <div className="relative min-w-[200px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
      <div className="text-sm font-semibold text-slate-900">
        {schema?.displayName ?? data.label}
      </div>
      <div className="mt-3 flex flex-col gap-3 text-slate-600">
        {inputSlotsWithoutWidgets.length > 0 || outputSlots.length > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              {inputSlotsWithoutWidgets.map(({ slot, displayName }) => (
                <div
                  key={`in-${slot.name}`}
                  className="flex items-start gap-1.5"
                >
                  <div className="relative flex min-h-5 items-center">
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={`in-${slot.name}`}
                      style={{ left: -HANDLE_OFFSET }}
                    />
                    <span className="pl-2" title={slot.tooltip}>
                      {displayName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1 text-right">
              {outputSlots.map((slot) => (
                <div
                  key={`out-${slot.name}`}
                  className="relative flex min-h-5 items-center justify-end"
                >
                  <span className="pr-2">{slot.name}</span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`out-${slot.name}`}
                    style={{ right: -HANDLE_OFFSET }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {inputSlotsWithWidgets.length > 0 ? (
          <div className="flex flex-col gap-3">
            {inputSlotsWithWidgets.map(({ slot, displayName, widget }) => (
              <div
                key={`widget-${slot.name}`}
                className="flex flex-col gap-1.5"
              >
                <div className="relative flex min-h-5 items-center">
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`in-${slot.name}`}
                    style={{ left: -HANDLE_OFFSET }}
                  />
                  <span className="pl-2" title={slot.tooltip}>
                    {displayName}
                  </span>
                </div>
                <div className="flex min-w-0 items-start">
                  <div className="min-w-0 flex-1">{widget}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const nodeTypes = { comfy: ComfyNode }
