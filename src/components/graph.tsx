"use client"

import {
  Background,
  Controls,
  type Edge,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import * as React from "react"
import {
  type CanvasNode,
  NodeSchemaContext,
  nodeTypes,
} from "@/components/graph/comfy-node"
import { CommandPalette } from "@/components/graph/command-palette"
import { API_BASE } from "@/components/graph/constants"
import { useAddNode } from "@/components/graph/use-add-node"
import { useCommandPaletteOpen } from "@/components/graph/use-command-palette-open"
import { useGraphConnections } from "@/components/graph/use-graph-connections"
import { useGraphShortcuts } from "@/components/graph/use-graph-shortcuts"
import { useNodeCatalog } from "@/components/graph/use-node-catalog"
import { useQueuePrompt } from "@/components/graph/use-queue-prompt"
import { useWorkflowPersistence } from "@/components/graph/use-workflow-persistence"

export function ComfyFlowCanvas() {
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPaletteOpen()
  const {
    nodeDefs,
    nodeSchemas,
    loading: nodesLoading,
    error: nodesError,
  } = useNodeCatalog()
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const reactFlowInstanceRef =
    React.useRef<ReactFlowInstance<CanvasNode> | null>(null)

  const { saveWorkflow, restoreWorkflow, createSnapshot } =
    useWorkflowPersistence({
      instanceRef: reactFlowInstanceRef,
      setNodes,
      setEdges,
    })

  const { queuePrompt } = useQueuePrompt({
    nodes,
    edges,
    nodeSchemas,
    apiBase: API_BASE,
    getSnapshot: createSnapshot,
  })

  const { isConnectionValid, handleConnect } = useGraphConnections({
    nodes,
    edges,
    nodeSchemas,
    setEdges,
  })

  const { addNode } = useAddNode({
    nodeSchemas,
    setNodes,
    setCommandOpen,
    instanceRef: reactFlowInstanceRef,
  })

  useGraphShortcuts({ onSave: saveWorkflow, onQueue: queuePrompt })

  const emptyStateText = nodesLoading
    ? "Loading nodes..."
    : (nodesError ?? "No nodes found.")

  return (
    <NodeSchemaContext.Provider value={nodeSchemas}>
      <div style={{ height: "100vh", width: "100vw" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          isValidConnection={isConnectionValid}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance
            restoreWorkflow(instance)
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
          onSelectNode={addNode}
        />
      </div>
    </NodeSchemaContext.Provider>
  )
}
