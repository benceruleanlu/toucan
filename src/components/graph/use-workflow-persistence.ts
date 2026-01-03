import type { Edge, ReactFlowInstance } from "@xyflow/react"
import * as React from "react"
import type { CanvasNode } from "@/components/graph/comfy-node"
import {
  createWorkflowSnapshot,
  isWorkflowSnapshot,
  type WorkflowSnapshot,
} from "@/lib/comfy/workflow-snapshot"

const WORKFLOW_STORAGE_KEY = "toucan:workflow:v1"

type UseWorkflowPersistenceArgs = {
  instanceRef: React.RefObject<ReactFlowInstance<CanvasNode> | null>
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
}

type WorkflowPersistenceApi = {
  saveWorkflow: () => void
  restoreWorkflow: (instance: ReactFlowInstance<CanvasNode, Edge>) => void
  createSnapshot: () => WorkflowSnapshot<CanvasNode, Edge> | null
}

export const useWorkflowPersistence = ({
  instanceRef,
  setNodes,
  setEdges,
}: UseWorkflowPersistenceArgs): WorkflowPersistenceApi => {
  const hasRestoredRef = React.useRef(false)

  const createSnapshot = React.useCallback(() => {
    const instance = instanceRef.current
    if (!instance) {
      return null
    }

    return createWorkflowSnapshot(instance.toObject())
  }, [instanceRef])

  const saveWorkflow = React.useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    const snapshot = createSnapshot()
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
  }, [createSnapshot])

  const restoreWorkflow = React.useCallback(
    (instance: ReactFlowInstance<CanvasNode, Edge>) => {
      if (hasRestoredRef.current) {
        return
      }
      hasRestoredRef.current = true

      if (typeof window === "undefined") {
        return
      }

      try {
        const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY)
        if (!raw) {
          return
        }
        const parsed = JSON.parse(raw) as unknown
        if (!isWorkflowSnapshot<CanvasNode, Edge>(parsed)) {
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

  return { saveWorkflow, restoreWorkflow, createSnapshot }
}
