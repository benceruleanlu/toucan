import type { Edge, Node, ReactFlowJsonObject } from "@xyflow/react"

export const WORKFLOW_SNAPSHOT_VERSION = 1 as const

export type WorkflowSnapshot<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> = {
  version: typeof WORKFLOW_SNAPSHOT_VERSION
  savedAt: string
  graph: ReactFlowJsonObject<TNode, TEdge>
}

export const isWorkflowSnapshot = <
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
>(
  value: unknown,
): value is WorkflowSnapshot<TNode, TEdge> => {
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

export const createWorkflowSnapshot = <TNode extends Node, TEdge extends Edge>(
  graph: ReactFlowJsonObject<TNode, TEdge>,
): WorkflowSnapshot<TNode, TEdge> => ({
  version: WORKFLOW_SNAPSHOT_VERSION,
  savedAt: new Date().toISOString(),
  graph,
})
