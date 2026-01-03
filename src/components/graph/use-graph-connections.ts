import { addEdge, type Connection, type Edge } from "@xyflow/react"
import * as React from "react"
import type { CanvasNode } from "@/components/graph/comfy-node"
import { isConnectionValid as isConnectionValidBase } from "@/lib/comfy/graph-validation"
import type { NodeSchemaMap } from "@/lib/comfy/objectInfo"

type UseGraphConnectionsArgs = {
  nodes: CanvasNode[]
  edges: Edge[]
  nodeSchemas: NodeSchemaMap
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
}

type GraphConnectionsApi = {
  isConnectionValid: (connection: Connection | Edge) => boolean
  handleConnect: (connection: Connection) => void
}

export const useGraphConnections = ({
  nodes,
  edges,
  nodeSchemas,
  setEdges,
}: UseGraphConnectionsArgs): GraphConnectionsApi => {
  const isConnectionValid = React.useCallback(
    (connection: Connection | Edge) =>
      isConnectionValidBase(connection, nodes, edges, nodeSchemas),
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

  return { isConnectionValid, handleConnect }
}
