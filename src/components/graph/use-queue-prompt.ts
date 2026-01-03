import type { Edge } from "@xyflow/react"
import * as React from "react"
import type { CanvasNode } from "@/components/graph/comfy-node"
import { getComfyClientId } from "@/lib/comfy/client-id"
import {
  applyControlAfterGenerate,
  type ControlAfterGenerateMode,
} from "@/lib/comfy/control-after-generate"
import { queuePrompt as requestPrompt } from "@/lib/comfy/inference"
import type { NodeSchemaMap } from "@/lib/comfy/objectInfo"
import { buildPromptFromGraph } from "@/lib/comfy/prompt"
import type { WorkflowSnapshot } from "@/lib/comfy/workflow-snapshot"

type UseQueuePromptArgs = {
  nodes: CanvasNode[]
  edges: Edge[]
  nodeSchemas: NodeSchemaMap
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>
  apiBase: string
  getSnapshot: () => WorkflowSnapshot<CanvasNode, Edge> | null
}

type QueuePromptApi = {
  queuePrompt: () => Promise<void>
}

const getControlAfterGenerateMode = (): ControlAfterGenerateMode => "after"

export const useQueuePrompt = ({
  nodes,
  edges,
  nodeSchemas,
  setNodes,
  apiBase,
  getSnapshot,
}: UseQueuePromptArgs): QueuePromptApi => {
  const controlMode = getControlAfterGenerateMode()
  const executedControlsRef = React.useRef<Set<string>>(new Set())

  const queuePrompt = React.useCallback(async () => {
    let nodesForPrompt = nodes
    let controlResult: { nodes: CanvasNode[]; didMutate: boolean } | null = null
    let stagedExecutedControls: Set<string> | null = null

    if (controlMode === "before") {
      stagedExecutedControls = new Set(executedControlsRef.current)
      controlResult = applyControlAfterGenerate({
        nodes,
        nodeSchemas,
        mode: "before",
        executedControls: stagedExecutedControls,
      })
      nodesForPrompt = controlResult.nodes
    }

    const { prompt, errors, warnings } = buildPromptFromGraph(
      nodesForPrompt,
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

    if (controlMode === "before" && controlResult?.didMutate) {
      setNodes(controlResult.nodes)
    }
    if (controlMode === "before" && stagedExecutedControls) {
      executedControlsRef.current = stagedExecutedControls
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

    if (controlMode === "after") {
      setNodes((current) => {
        const updated = applyControlAfterGenerate({
          nodes: current,
          nodeSchemas,
          mode: "after",
        })
        return updated.nodes
      })
    }

    console.info("Prompt queued", result.payload)
  }, [apiBase, edges, getSnapshot, nodeSchemas, nodes, setNodes])

  return { queuePrompt }
}
