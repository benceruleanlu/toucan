import * as React from "react"
import type {
  ExecutionState,
  NodeExecutionStatus,
} from "@/components/graph/execution-context"
import { getComfyClientId } from "@/lib/comfy/client-id"
import { interruptPrompt } from "@/lib/comfy/inference"

type UseExecutionMonitorArgs = {
  apiBase: string
}

const EMPTY_STATE: ExecutionState = {
  phase: "idle",
  promptId: null,
  currentNodeId: null,
  queueRemaining: null,
  startedAt: null,
  nodeStatuses: {},
  nodeProgress: {},
  nodeErrors: {},
}

const toWsUrl = (apiBase: string, clientId: string) => {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const baseUrl = new URL(apiBase, window.location.href)
    const wsUrl = new URL(baseUrl.toString())
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:"
    wsUrl.pathname = "/ws"
    wsUrl.searchParams.set("clientId", clientId)
    return wsUrl.toString()
  } catch {
    return null
  }
}

const mapProgressState = (state: unknown): NodeExecutionStatus | null => {
  if (state === "running") {
    return "running"
  }
  if (state === "finished") {
    return "completed"
  }
  if (state === "error") {
    return "error"
  }
  return null
}

const mergeStatus = (
  current: NodeExecutionStatus | undefined,
  next: NodeExecutionStatus,
) => {
  if (current === "cached" && next === "completed") {
    return current
  }
  if (current === "error" || current === "interrupted") {
    return current
  }
  return next
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null
  }
  return value as Record<string, unknown>
}

const getString = (value: Record<string, unknown> | null, key: string) => {
  const raw = value?.[key]
  return typeof raw === "string" ? raw : null
}

const getNumber = (value: Record<string, unknown> | null, key: string) => {
  const raw = value?.[key]
  return typeof raw === "number" ? raw : null
}

export const useExecutionMonitor = ({ apiBase }: UseExecutionMonitorArgs) => {
  const [state, setState] = React.useState<ExecutionState>(EMPTY_STATE)
  const displayNodeById = React.useRef<Map<string, string>>(new Map())
  const wsRef = React.useRef<WebSocket | null>(null)

  const resolveNodeId = React.useCallback(
    (nodeId: string | null | undefined, displayNodeId?: string | null) => {
      if (!nodeId) {
        return null
      }
      if (displayNodeId) {
        displayNodeById.current.set(nodeId, displayNodeId)
        return displayNodeId
      }
      return displayNodeById.current.get(nodeId) ?? nodeId
    },
    [],
  )

  const markPromptQueued = React.useCallback((promptId: string | null) => {
    if (!promptId) {
      return
    }
    displayNodeById.current.clear()
    setState((prev) => ({
      ...EMPTY_STATE,
      phase: "queued",
      promptId,
      queueRemaining: prev.queueRemaining,
    }))
  }, [])

  const interrupt = React.useCallback(async () => {
    const promptId = state.promptId
    if (!promptId) {
      return
    }
    const result = await interruptPrompt({ baseUrl: apiBase, promptId })
    if (!result.ok) {
      console.warn(result.message ?? "Failed to interrupt execution.")
    }
  }, [apiBase, state.promptId])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const clientId = getComfyClientId()
    const wsUrl = toWsUrl(apiBase, clientId)
    if (!wsUrl) {
      return
    }

    const socket = new WebSocket(wsUrl)
    wsRef.current = socket

    const handleOpen = () => {
      socket.send(
        JSON.stringify({
          type: "feature_flags",
          data: { supports_preview_metadata: true },
        }),
      )
    }

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") {
        return
      }

      let message: { type?: string; data?: unknown }
      try {
        message = JSON.parse(event.data) as { type?: string; data?: unknown }
      } catch {
        return
      }

      const payload = message.data
      const payloadRecord = asRecord(payload)
      switch (message.type) {
        case "status": {
          const statusRecord = asRecord(payloadRecord?.status)
          const execInfo = asRecord(statusRecord?.exec_info)
          const queueRemaining = getNumber(execInfo, "queue_remaining")
          if (queueRemaining !== null) {
            setState((prev) => ({ ...prev, queueRemaining }))
          }
          return
        }
        case "execution_start": {
          const promptId = getString(payloadRecord, "prompt_id")
          const startedAt = getNumber(payloadRecord, "timestamp") ?? Date.now()
          displayNodeById.current.clear()
          setState((prev) => ({
            ...EMPTY_STATE,
            phase: "running",
            promptId,
            startedAt,
            queueRemaining: prev.queueRemaining,
          }))
          return
        }
        case "execution_cached": {
          const nodes = payloadRecord?.nodes
          if (!Array.isArray(nodes)) {
            return
          }
          setState((prev) => {
            const nextStatuses = { ...prev.nodeStatuses }
            for (const nodeId of nodes) {
              if (typeof nodeId !== "string") {
                continue
              }
              const resolved = resolveNodeId(nodeId)
              if (!resolved) {
                continue
              }
              nextStatuses[resolved] = "cached"
            }
            return { ...prev, nodeStatuses: nextStatuses }
          })
          return
        }
        case "executing": {
          const nodeId = getString(payloadRecord, "node")
          if (!nodeId) {
            setState((prev) => ({
              ...prev,
              phase: "idle",
              currentNodeId: null,
              startedAt: null,
            }))
            return
          }

          const displayNodeId = getString(payloadRecord, "display_node")
          const resolved = resolveNodeId(nodeId, displayNodeId)
          if (!resolved) {
            return
          }
          setState((prev) => ({
            ...prev,
            phase: "running",
            currentNodeId: resolved,
            nodeStatuses: {
              ...prev.nodeStatuses,
              [resolved]: "running",
            },
          }))
          return
        }
        case "executed": {
          const nodeId = getString(payloadRecord, "node")
          if (!nodeId) {
            return
          }
          const displayNodeId = getString(payloadRecord, "display_node")
          const resolved = resolveNodeId(nodeId, displayNodeId)
          if (!resolved) {
            return
          }
          setState((prev) => ({
            ...prev,
            nodeStatuses: {
              ...prev.nodeStatuses,
              [resolved]: mergeStatus(prev.nodeStatuses[resolved], "completed"),
            },
          }))
          return
        }
        case "execution_error": {
          const nodeId = getString(payloadRecord, "node_id")
          const messageText =
            getString(payloadRecord, "exception_message") ?? "Execution error"
          const resolved = resolveNodeId(nodeId)
          setState((prev) => {
            if (!resolved) {
              return { ...prev, phase: "error", currentNodeId: null }
            }
            return {
              ...prev,
              phase: "error",
              currentNodeId: null,
              nodeStatuses: {
                ...prev.nodeStatuses,
                [resolved]: "error",
              },
              nodeErrors: {
                ...prev.nodeErrors,
                [resolved]: messageText,
              },
            }
          })
          return
        }
        case "execution_interrupted": {
          const nodeId = getString(payloadRecord, "node_id")
          const resolved = resolveNodeId(nodeId)
          setState((prev) => {
            if (!resolved) {
              return { ...prev, phase: "interrupted", currentNodeId: null }
            }
            return {
              ...prev,
              phase: "interrupted",
              currentNodeId: null,
              nodeStatuses: {
                ...prev.nodeStatuses,
                [resolved]: "interrupted",
              },
            }
          })
          return
        }
        case "execution_success": {
          setState((prev) => ({
            ...prev,
            phase: "idle",
            currentNodeId: null,
            startedAt: null,
          }))
          return
        }
        case "progress": {
          const nodeId = getString(payloadRecord, "node")
          const value = getNumber(payloadRecord, "value")
          const max = getNumber(payloadRecord, "max")
          if (!nodeId || value === null || max === null) {
            return
          }
          const resolved = resolveNodeId(nodeId)
          if (!resolved) {
            return
          }
          setState((prev) => ({
            ...prev,
            nodeProgress: {
              ...prev.nodeProgress,
              [resolved]: { value, max },
            },
          }))
          return
        }
        case "progress_state": {
          const nodes = asRecord(payloadRecord?.nodes)
          if (!nodes) {
            return
          }
          setState((prev) => {
            const nextStatuses = { ...prev.nodeStatuses }
            const nextProgress = { ...prev.nodeProgress }
            for (const nodeValue of Object.values(nodes)) {
              const nodeRecord = asRecord(nodeValue)
              if (!nodeRecord) {
                continue
              }
              const nodeId = getString(nodeRecord, "node_id")
              if (!nodeId) {
                continue
              }
              const displayNodeId = getString(nodeRecord, "display_node_id")
              const resolved = resolveNodeId(nodeId, displayNodeId)
              if (!resolved) {
                continue
              }
              const value = getNumber(nodeRecord, "value")
              const max = getNumber(nodeRecord, "max")
              if (value !== null && max !== null) {
                nextProgress[resolved] = { value, max }
              }
              const mappedStatus = mapProgressState(nodeRecord.state)
              if (mappedStatus) {
                nextStatuses[resolved] = mergeStatus(
                  nextStatuses[resolved],
                  mappedStatus,
                )
              }
            }
            return {
              ...prev,
              nodeStatuses: nextStatuses,
              nodeProgress: nextProgress,
            }
          })
          return
        }
        default:
          return
      }
    }

    const handleClose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null
      }
    }

    socket.addEventListener("open", handleOpen)
    socket.addEventListener("message", handleMessage)
    socket.addEventListener("close", handleClose)
    socket.addEventListener("error", handleClose)

    return () => {
      socket.removeEventListener("open", handleOpen)
      socket.removeEventListener("message", handleMessage)
      socket.removeEventListener("close", handleClose)
      socket.removeEventListener("error", handleClose)
      socket.close()
    }
  }, [apiBase, resolveNodeId])

  return { state, markPromptQueued, interrupt }
}
