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
import { ExecutionStateContext } from "@/components/graph/execution-context"
import {
  renderControlAfterGenerateWidget,
  renderNodeWidget,
} from "@/components/graph/node-widgets"
import type { WidgetControlValue } from "@/lib/comfy/control-after-generate"
import {
  getWidgetSpec,
  type NodeSchemaMap,
  type WidgetValue,
} from "@/lib/comfy/objectInfo"
import { cn } from "@/lib/utils"

export type ComfyNodeData = {
  label: string
  nodeType: string
  widgetValues: Record<string, WidgetValue>
  widgetControlValues?: Record<string, WidgetControlValue>
}

export type ComfyFlowNode = Node<ComfyNodeData, "comfy">
export type CanvasNode = ComfyFlowNode

export const NodeSchemaContext = React.createContext<NodeSchemaMap>({})

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className={cn("block", className)}
    fill="none"
  >
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function ComfyNode({ data, id }: NodeProps<ComfyFlowNode>) {
  const { updateNodeData } = useReactFlow<CanvasNode>()
  const nodeSchemas = React.useContext(NodeSchemaContext)
  const executionState = React.useContext(ExecutionStateContext)
  const schema = nodeSchemas[data.nodeType]
  const inputSlots =
    schema?.inputs.filter((slot) => slot.group !== "hidden") ?? []
  const outputSlots = schema?.outputs ?? []
  const widgetValues = data.widgetValues ?? {}
  const widgetControlValues = data.widgetControlValues ?? {}
  const nodeStatus = executionState?.nodeStatuses[id]
  const nodeProgress = executionState?.nodeProgress[id]
  const nodeError = executionState?.nodeErrors[id]
  const progressPercent =
    nodeProgress && nodeProgress.max > 0
      ? Math.min(100, (nodeProgress.value / nodeProgress.max) * 100)
      : null
  const badgeBase =
    "inline-flex items-center justify-center rounded text-[10px] font-semibold leading-none"

  const statusBadge = (() => {
    if (nodeStatus === "cached") {
      return (
        <span
          className={cn(badgeBase, "bg-slate-100 px-1.5 py-0.5 text-slate-500")}
        >
          CACHED
        </span>
      )
    }
    if (nodeStatus === "completed") {
      return (
        <span className={cn(badgeBase, "h-4 w-4 text-slate-400")}>
          <CheckIcon className="h-3 w-3" />
        </span>
      )
    }
    if (nodeStatus === "error") {
      return (
        <span className={cn(badgeBase, "bg-red-50 px-1.5 py-0.5 text-red-600")}>
          ERR
        </span>
      )
    }
    if (nodeStatus === "interrupted") {
      return (
        <span
          className={cn(badgeBase, "bg-amber-50 px-1.5 py-0.5 text-amber-600")}
        >
          STOP
        </span>
      )
    }
    return null
  })()

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

  const handleControlChange = React.useCallback(
    (slotName: string, value: WidgetControlValue) => {
      updateNodeData(id, (node) => ({
        widgetControlValues: {
          ...(node.data.widgetControlValues ?? {}),
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
    const controlWidget = renderControlAfterGenerateWidget({
      slot,
      widgetSpec,
      value: widgetControlValues[slot.name],
      onChange: handleControlChange,
    })

    if (widget) {
      inputSlotsWithWidgets.push({ slot, displayName, widget, controlWidget })
    } else {
      inputSlotsWithoutWidgets.push({ slot, displayName })
    }
  }

  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm",
        nodeStatus === "running" &&
          "ring-2 ring-sky-400 ring-offset-2 ring-offset-white",
        nodeStatus === "error" && "border-red-300 ring-1 ring-red-200",
        nodeStatus === "interrupted" &&
          "border-amber-300 ring-1 ring-amber-200",
      )}
      title={nodeError}
    >
      {statusBadge ? (
        <div className="absolute right-2 top-2">{statusBadge}</div>
      ) : null}
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
            {inputSlotsWithWidgets.map(
              ({ slot, displayName, widget, controlWidget }) => (
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
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">{widget}</div>
                    {controlWidget ? (
                      <div className="w-28 shrink-0">{controlWidget}</div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}
      </div>
      {progressPercent !== null ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}

export const nodeTypes = { comfy: ComfyNode }
