import * as React from "react"
import type { ExecutionPhase } from "@/components/graph/execution-context"

type ExecutionHudProps = {
  phase: ExecutionPhase
  currentNodeLabel: string | null
  queueRemaining: number | null
  startedAt: number | null
  onCancel?: () => Promise<void> | void
}

const formatDuration = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export const ExecutionHud = ({
  phase,
  currentNodeLabel,
  queueRemaining,
  startedAt,
  onCancel,
}: ExecutionHudProps) => {
  const [, forceRender] = React.useState(0)
  const [isCanceling, setIsCanceling] = React.useState(false)
  const shouldTick = phase === "running" || phase === "queued"

  React.useEffect(() => {
    if (!startedAt || !shouldTick) {
      return
    }
    const interval = window.setInterval(() => {
      forceRender((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [shouldTick, startedAt])

  const elapsed =
    startedAt && shouldTick ? formatDuration(Date.now() - startedAt) : null
  const statusLine =
    phase === "running"
      ? `Running: ${currentNodeLabel ?? "Preparing"}`
      : phase === "queued"
        ? "Queued"
        : phase === "error"
          ? "Execution error"
          : "Execution interrupted"

  const metaParts = []
  if (elapsed) {
    metaParts.push(`Elapsed ${elapsed}`)
  }
  if (queueRemaining !== null) {
    metaParts.push(`Queue ${queueRemaining}`)
  }
  const metaLine = metaParts.join(" | ")

  const showCancel =
    typeof onCancel === "function" &&
    (phase === "running" || phase === "queued")

  if (phase === "idle") {
    return null
  }

  const handleCancel = async () => {
    if (!onCancel) {
      return
    }
    try {
      setIsCanceling(true)
      await onCancel()
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 flex max-w-xs items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <div className="flex h-5 w-5 items-center justify-center">
        {phase === "error" ? (
          <span className="h-2 w-2 rounded-full bg-red-400" />
        ) : phase === "interrupted" ? (
          <span className="h-2 w-2 rounded-full bg-amber-400" />
        ) : (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-slate-900">
          {statusLine}
        </div>
        {metaLine ? (
          <div className="mt-0.5 text-[11px] text-slate-500">{metaLine}</div>
        ) : null}
      </div>
      {showCancel ? (
        <button
          type="button"
          className="pointer-events-auto rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleCancel}
          disabled={isCanceling}
        >
          {isCanceling ? "Stopping" : "Stop"}
        </button>
      ) : null}
    </div>
  )
}
