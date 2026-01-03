import type { ReactFlowInstance } from "@xyflow/react"
import * as React from "react"
import type { CanvasNode } from "@/components/graph/comfy-node"
import { buildControlDefaults } from "@/lib/comfy/control-after-generate"
import type { NodeCatalogEntry, NodeSchemaMap } from "@/lib/comfy/objectInfo"
import { buildWidgetDefaults } from "@/lib/comfy/widget-defaults"

const createNodeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type UseAddNodeArgs = {
  nodeSchemas: NodeSchemaMap
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>
  setCommandOpen: (open: boolean) => void
  instanceRef: React.RefObject<ReactFlowInstance<CanvasNode> | null>
}

type AddNodeApi = {
  addNode: (nodeDef: NodeCatalogEntry) => void
}

export const useAddNode = ({
  nodeSchemas,
  setNodes,
  setCommandOpen,
  instanceRef,
}: UseAddNodeArgs): AddNodeApi => {
  const addNode = React.useCallback(
    (nodeDef: NodeCatalogEntry) => {
      setNodes((current) => {
        const index = current.length
        const instance = instanceRef.current
        const center = instance
          ? instance.screenToFlowPosition({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            })
          : { x: 0, y: 0 }
        const offset = 24 * index
        const position = {
          x: center.x + offset,
          y: center.y + offset,
        }
        const widgetValues = buildWidgetDefaults(nodeSchemas[nodeDef.name])
        const widgetControlValues = buildControlDefaults(
          nodeSchemas[nodeDef.name],
        )

        return [
          ...current,
          {
            id: createNodeId(),
            type: "comfy",
            position,
            data: {
              label: nodeDef.displayName,
              nodeType: nodeDef.name,
              widgetValues,
              widgetControlValues,
            },
          },
        ]
      })
      setCommandOpen(false)
    },
    [nodeSchemas, setCommandOpen, setNodes, instanceRef],
  )

  return { addNode }
}
