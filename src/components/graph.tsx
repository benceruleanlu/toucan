"use client"

import {
  Background,
  Controls,
  type Node,
  ReactFlow,
  type ReactFlowInstance,
  useNodesState,
} from "@xyflow/react"
import * as React from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const DEFAULT_API_BASE = "http://127.0.0.1:8188"
const API_BASE =
  process.env.NEXT_PUBLIC_COMFY_API_BASE?.trim() || DEFAULT_API_BASE
const MAX_RESULTS_WHEN_EMPTY = 60

type RawNodeDef = {
  name?: string
  display_name?: string
  category?: string
  description?: string
}

type NodeDef = {
  name: string
  displayName: string
  description: string
  searchValue: string
}

type CanvasNode = Node<{ label: string }>

const normalizeNodeDefs = (raw: Record<string, RawNodeDef>): NodeDef[] => {
  return Object.entries(raw).map(([key, value]) => {
    const name = value.name?.trim() || key
    const displayName = value.display_name?.trim() || name
    const description = value.description?.trim() || ""
    const searchValue = [displayName, name, description]
      .filter(Boolean)
      .join(" ")

    return { name, displayName, description, searchValue }
  })
}

export function ComfyFlowCanvas() {
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [commandQuery, setCommandQuery] = React.useState("")
  const [nodeDefs, setNodeDefs] = React.useState<NodeDef[]>([])
  const [nodesLoading, setNodesLoading] = React.useState(false)
  const [nodesError, setNodesError] = React.useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([])

  const reactFlowInstanceRef =
    React.useRef<ReactFlowInstance<CanvasNode> | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    const loadNodeDefs = async () => {
      setNodesLoading(true)
      setNodesError(null)

      try {
        const response = await fetch(`${API_BASE}/object_info`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load nodes (${response.status})`)
        }

        const data = (await response.json()) as Record<string, RawNodeDef>
        const normalized = normalizeNodeDefs(data).sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        )
        setNodeDefs(normalized)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        setNodesError(
          error instanceof Error ? error.message : "Failed to load nodes.",
        )
      } finally {
        setNodesLoading(false)
      }
    }

    loadNodeDefs()
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || commandOpen) {
        return
      }

      if (event.code !== "Space") {
        return
      }

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

      event.preventDefault()
      setCommandOpen(true)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [commandOpen])

  React.useEffect(() => {
    if (!commandOpen) {
      setCommandQuery("")
    }
  }, [commandOpen])

  const visibleNodes = React.useMemo(() => {
    if (commandQuery.trim().length === 0) {
      return nodeDefs.slice(0, MAX_RESULTS_WHEN_EMPTY)
    }
    return nodeDefs
  }, [nodeDefs, commandQuery])

  const handleAddNode = React.useCallback(
    (nodeDef: NodeDef) => {
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

        return [
          ...current,
          {
            id: `node-${index + 1}`,
            position,
            data: { label: nodeDef.displayName },
          },
        ]
      })
      setCommandOpen(false)
    },
    [setNodes],
  )

  const emptyStateText = nodesLoading
    ? "Loading nodes..."
    : (nodesError ?? "No nodes found.")

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Search nodes"
        description="Search for nodes to add to the canvas."
      >
        <CommandInput
          value={commandQuery}
          onValueChange={setCommandQuery}
          placeholder="Search nodes..."
        />
        <CommandList>
          <CommandEmpty>{emptyStateText}</CommandEmpty>
          <CommandGroup heading="Nodes">
            {visibleNodes.map((node) => (
              <CommandItem
                key={node.name}
                value={node.searchValue}
                onSelect={() => handleAddNode(node)}
              >
                <div className="flex flex-col">
                  <span>{node.displayName}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
