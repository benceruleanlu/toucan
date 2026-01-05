import * as React from "react"

export type ExecutionPhase =
  | "idle"
  | "queued"
  | "running"
  | "error"
  | "interrupted"

export type NodeExecutionStatus =
  | "running"
  | "completed"
  | "cached"
  | "error"
  | "interrupted"

export type NodeProgress = {
  value: number
  max: number
}

export type FileOutput = {
  filename: string
  subfolder?: string | null
  type?: string | null
  url?: string | null
  previewUrl?: string | null
}

export type NodeOutput = {
  images?: FileOutput[]
  latents?: FileOutput[]
}

export type ExecutionState = {
  phase: ExecutionPhase
  promptId: string | null
  currentNodeId: string | null
  queueRemaining: number | null
  startedAt: number | null
  nodeStatuses: Record<string, NodeExecutionStatus>
  nodeProgress: Record<string, NodeProgress>
  nodeErrors: Record<string, string>
  nodeOutputs: Record<string, NodeOutput>
}

export const ExecutionStateContext = React.createContext<ExecutionState | null>(
  null,
)
