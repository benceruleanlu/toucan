"use client"

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  ReactFlow,
  type ReactFlowInstance,
  type ReactFlowJsonObject,
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
import { useCommandPaletteOpen } from "@/components/graph/use-command-palette-open"
import { useNodeCatalog } from "@/components/graph/use-node-catalog"
import { getComfyClientId } from "@/lib/comfy/client-id"
import type {
  InputSlot,
  NodeCatalogEntry,
  NodeSchema,
  NodeSchemaMap,
  OutputSlot,
} from "@/lib/comfy/objectInfo"
import { buildPromptFromGraph } from "@/lib/comfy/prompt"
import { buildWidgetDefaults } from "@/lib/comfy/widget-defaults"

type ResolvedConnectionSlots = {
  sourceNode: CanvasNode
  targetNode: CanvasNode
  sourceSchema: NodeSchema
  targetSchema: NodeSchema
  sourceSlot: OutputSlot
  targetSlot: InputSlot
}

const WORKFLOW_STORAGE_KEY = "toucan:workflow:v1"
const WORKFLOW_SNAPSHOT_VERSION = 1 as const

type WorkflowSnapshot = {
  version: typeof WORKFLOW_SNAPSHOT_VERSION
  savedAt: string
  graph: ReactFlowJsonObject<CanvasNode, Edge>
}

const isWorkflowSnapshot = (value: unknown): value is WorkflowSnapshot => {
  if (!value || typeof value !== "object") {
    return false
  }

  const snapshot = value as WorkflowSnapshot
  if (snapshot.version !== WORKFLOW_SNAPSHOT_VERSION) {
    return false
  }
  if (typeof snapshot.savedAt !== "string") {
    return false
  }
  if (
    !snapshot.graph ||
    !Array.isArray(snapshot.graph.nodes) ||
    !Array.isArray(snapshot.graph.edges) ||
    typeof snapshot.graph.viewport !== "object"
  ) {
    return false
  }

  return true
}

const createNodeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isTypeCompatible = (resolved: ResolvedConnectionSlots) => {
  const targetType = resolved.targetSlot.valueType
  if (!targetType) {
    return false
  }

  return resolved.sourceSlot.type === targetType
}

const createsCycle = (connection: Connection | Edge, edges: Edge[]) => {
  if (!connection.source || !connection.target) {
    return true
  }

  if (connection.source === connection.target) {
    return true
  }

  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const { source, target } = edge
    if (!source || !target) {
      continue
    }
    const neighbors = adjacency.get(source)
    if (neighbors) {
      neighbors.push(target)
    } else {
      adjacency.set(source, [target])
    }
  }

  const stack = [connection.target]
  const visited = new Set<string>()
  while (stack.length > 0) {
    const nodeId = stack.pop()
    if (!nodeId) {
      continue
    }
    if (nodeId === connection.source) {
      return true
    }
    if (visited.has(nodeId)) {
      continue
    }
    visited.add(nodeId)
    const neighbors = adjacency.get(nodeId)
    if (!neighbors) {
      continue
    }
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor)
      }
    }
  }

  return false
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

const resolveConnectionSlots = (
  connection: Connection | Edge,
  nodes: CanvasNode[],
  nodeSchemas: NodeSchemaMap,
): ResolvedConnectionSlots | null => {
  if (!connection.source || !connection.target) {
    return null
  }

  const sourceSlotName = parseHandleSlotName(connection.sourceHandle, "out-")
  const targetSlotName = parseHandleSlotName(connection.targetHandle, "in-")
  if (!sourceSlotName || !targetSlotName) {
    return null
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)
  if (!sourceNode || !targetNode) {
    return null
  }

  const sourceSchema = nodeSchemas[sourceNode.data.nodeType]
  const targetSchema = nodeSchemas[targetNode.data.nodeType]
  if (!sourceSchema || !targetSchema) {
    return null
  }

  const sourceSlot = sourceSchema.outputs.find(
    (slot) => slot.name === sourceSlotName,
  )
  const targetSlot = targetSchema.inputs.find(
    (slot) => slot.name === targetSlotName,
  )
  if (!sourceSlot || !targetSlot) {
    return null
  }

  return {
    sourceNode,
    targetNode,
    sourceSchema,
    targetSchema,
    sourceSlot,
    targetSlot,
  }
}

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
  const hasRestoredRef = React.useRef(false)

  const createWorkflowSnapshot = React.useCallback(() => {
    const instance = reactFlowInstanceRef.current
    if (!instance) {
      return null
    }

    const graph = instance.toObject()
    const snapshot: WorkflowSnapshot = {
      version: WORKFLOW_SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      graph,
    }

    return snapshot
  }, [])

  const saveWorkflow = React.useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    const snapshot = createWorkflowSnapshot()
    if (!snapshot) {
      return
    }

    try {
      window.localStorage.setItem(
        WORKFLOW_STORAGE_KEY,
        JSON.stringify(snapshot),
      )
    } catch {
      return
    }
  }, [createWorkflowSnapshot])

  const loadWorkflow = React.useCallback(
    (instance: ReactFlowInstance<CanvasNode, Edge>) => {
      if (typeof window === "undefined") {
        return
      }

      try {
        const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY)
        if (!raw) {
          return
        }
        const parsed = JSON.parse(raw) as unknown
        if (!isWorkflowSnapshot(parsed)) {
          return
        }

        setNodes(parsed.graph.nodes)
        setEdges(parsed.graph.edges)
        instance.setViewport(parsed.graph.viewport)
      } catch {
        return
      }
    },
    [setEdges, setNodes],
  )

  const queuePrompt = React.useCallback(async () => {
    const { prompt, errors, warnings } = buildPromptFromGraph(
      nodes,
      edges,
      nodeSchemas,
    )

    if (errors.length > 0) {
      window.alert(
        `Fix the following before running:\n${errors.map((error) => `- ${error}`).join("\n")}`,
      )
      return
    }

    if (warnings.length > 0) {
      const proceed = window.confirm(
        `Warnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n\nRun anyway?`,
      )
      if (!proceed) {
        return
      }
    }

    const extra_data: Record<string, unknown> = {
      client_id: getComfyClientId(),
    }
    const snapshot = createWorkflowSnapshot()
    if (snapshot) {
      extra_data.extra_pnginfo = { workflow: snapshot.graph }
    }

    let response: Response
    try {
      response = await fetch(`${API_BASE}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, extra_data }),
      })
    } catch {
      window.alert("Failed to reach the ComfyUI backend.")
      return
    }

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      let message = `Failed to queue prompt (${response.status}).`
      if (payload && typeof payload === "object") {
        const errorValue = (payload as { error?: unknown }).error
        if (typeof errorValue === "string") {
          message = errorValue
        } else if (errorValue && typeof errorValue === "object") {
          const errorMessage = (errorValue as { message?: unknown }).message
          if (typeof errorMessage === "string") {
            message = errorMessage
          }
        }
      }
      window.alert(message)
      return
    }

    console.info("Prompt queued", payload)
  }, [createWorkflowSnapshot, edges, nodeSchemas, nodes])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        saveWorkflow()
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        void queuePrompt()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [queuePrompt, saveWorkflow])

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
            id: createNodeId(),
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

  const isConnectionValid = React.useCallback(
    (connection: Connection | Edge) => {
      const resolved = resolveConnectionSlots(connection, nodes, nodeSchemas)
      if (!resolved) {
        return false
      }

      if (!isTypeCompatible(resolved)) {
        return false
      }

      if (createsCycle(connection, edges)) {
        return false
      }

      return true
    },
    [edges, nodeSchemas, nodes],
  )

  const handleConnect = React.useCallback(
    (connection: Connection) => {
      if (!isConnectionValid(connection)) {
        return
      }
      setEdges((current) => addEdge(connection, current))
    },
    [isConnectionValid, setEdges],
  )

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
            if (hasRestoredRef.current) {
              return
            }
            hasRestoredRef.current = true
            loadWorkflow(instance)
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
