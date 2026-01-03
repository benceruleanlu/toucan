"use client"

import {
  Background,
  Controls,
  ReactFlow,
  type ReactFlowInstance,
  useNodesState,
} from "@xyflow/react"
import * as React from "react"
import { CommandPalette } from "@/components/graph/command-palette"
import {
  NodeSchemaContext,
  type CanvasNode,
  nodeTypes,
} from "@/components/graph/comfy-node"
import { useCommandPaletteOpen } from "@/components/graph/use-command-palette-open"
import { useNodeCatalog } from "@/components/graph/use-node-catalog"
import type { NodeCatalogEntry } from "@/lib/comfy/objectInfo"
import { buildWidgetDefaults } from "@/lib/comfy/widget-defaults"

export function ComfyFlowCanvas() {
  const { open: commandOpen, setOpen: setCommandOpen } =
    useCommandPaletteOpen()
  const {
    nodeDefs,
    nodeSchemas,
    loading: nodesLoading,
    error: nodesError,
  } = useNodeCatalog()
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([])

  const reactFlowInstanceRef =
    React.useRef<ReactFlowInstance<CanvasNode> | null>(null)

  const handleAddNode = React.useCallback(
    (nodeDef: NodeCatalogEntry) => {
      setNodes((current) => {
        const index = current.length
        const instance = reactFlowInstanceRef.current
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

        return [
          ...current,
          {
            id: `node-${index + 1}`,
            type: "comfy",
            position,
            data: {
              label: nodeDef.displayName,
              nodeType: nodeDef.name,
              widgetValues,
            },
          },
        ]
      })
      setCommandOpen(false)
    },
    [nodeSchemas, setCommandOpen, setNodes],
  )

  const emptyStateText = nodesLoading
    ? "Loading nodes..."
    : (nodesError ?? "No nodes found.")

  return (
    <NodeSchemaContext.Provider value={nodeSchemas}>
      <div style={{ height: "100vh", width: "100vw" }}>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          nodeDefs={nodeDefs}
          emptyStateText={emptyStateText}
          onSelectNode={handleAddNode}
        />
      </div>
    </NodeSchemaContext.Provider>
  )
}
