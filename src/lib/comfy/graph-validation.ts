import type {
  InputSlot,
  NodeSchema,
  NodeSchemaMap,
  OutputSlot,
} from "@/lib/comfy/objectInfo"

export type GraphNodeLike = {
  id: string
  data?: {
    nodeType?: string
  }
}

export type GraphEdgeLike = {
  source?: string | null
  target?: string | null
  sourceHandle?: string | null
  targetHandle?: string | null
}

export type ResolvedConnectionSlots<
  NodeType extends GraphNodeLike = GraphNodeLike,
> = {
  sourceNode: NodeType
  targetNode: NodeType
  sourceSchema: NodeSchema
  targetSchema: NodeSchema
  sourceSlot: OutputSlot
  targetSlot: InputSlot
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

export const resolveConnectionSlots = <
  NodeType extends GraphNodeLike,
  EdgeType extends GraphEdgeLike,
>(
  connection: EdgeType,
  nodes: NodeType[],
  nodeSchemas: NodeSchemaMap,
): ResolvedConnectionSlots<NodeType> | null => {
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

  const sourceSchema = nodeSchemas[sourceNode.data?.nodeType ?? ""]
  const targetSchema = nodeSchemas[targetNode.data?.nodeType ?? ""]
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

export const isTypeCompatible = (resolved: ResolvedConnectionSlots) => {
  const targetType = resolved.targetSlot.valueType
  if (!targetType) {
    return false
  }

  return resolved.sourceSlot.type === targetType
}

export const createsCycle = <EdgeType extends GraphEdgeLike>(
  connection: EdgeType,
  edges: EdgeType[],
) => {
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

export const isConnectionValid = <
  NodeType extends GraphNodeLike,
  EdgeType extends GraphEdgeLike,
>(
  connection: EdgeType,
  nodes: NodeType[],
  edges: EdgeType[],
  nodeSchemas: NodeSchemaMap,
) => {
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
}
