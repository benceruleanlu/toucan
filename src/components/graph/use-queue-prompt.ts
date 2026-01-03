import type { Edge } from "@xyflow/react"
import * as React from "react"
import type { CanvasNode } from "@/components/graph/comfy-node"
import { getComfyClientId } from "@/lib/comfy/client-id"
import { queuePrompt as requestPrompt } from "@/lib/comfy/inference"
import type { NodeSchemaMap } from "@/lib/comfy/objectInfo"
import { buildPromptFromGraph } from "@/lib/comfy/prompt"
import type { WorkflowSnapshot } from "@/lib/comfy/workflow-snapshot"

type UseQueuePromptArgs = {
  nodes: CanvasNode[]
  edges: Edge[]
  nodeSchemas: NodeSchemaMap
  apiBase: string
  getSnapshot: () => WorkflowSnapshot<CanvasNode, Edge> | null
}

type QueuePromptApi = {
  queuePrompt: () => Promise<void>
}

export const useQueuePrompt = ({
  nodes,
  edges,
  nodeSchemas,
  apiBase,
  getSnapshot,
}: UseQueuePromptArgs): QueuePromptApi => {
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

    const snapshot = getSnapshot()
    const result = await requestPrompt({
      baseUrl: apiBase,
      prompt,
      clientId: getComfyClientId(),
      workflow: snapshot?.graph,
    })

    if (!result.ok) {
      window.alert(result.message)
      return
    }

    console.info("Prompt queued", result.payload)
  }, [apiBase, edges, getSnapshot, nodeSchemas, nodes])

  return { queuePrompt }
}
