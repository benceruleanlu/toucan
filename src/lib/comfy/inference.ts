import type { PromptMap } from "@/lib/comfy/prompt"

type QueuePromptInput = {
  baseUrl: string
  prompt: PromptMap
  clientId: string
  workflow?: unknown
}

type InterruptPromptInput = {
  baseUrl: string
  promptId?: string | null
}

export type QueuePromptResult =
  | { ok: true; payload: unknown }
  | { ok: false; message: string; payload?: unknown }

export type InterruptPromptResult =
  | { ok: true }
  | { ok: false; message?: string }

const extractErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const errorValue = (payload as { error?: unknown }).error
  if (typeof errorValue === "string") {
    return errorValue
  }
  if (errorValue && typeof errorValue === "object") {
    const errorMessage = (errorValue as { message?: unknown }).message
    if (typeof errorMessage === "string") {
      return errorMessage
    }
  }

  return null
}

export const queuePrompt = async ({
  baseUrl,
  prompt,
  clientId,
  workflow,
}: QueuePromptInput): Promise<QueuePromptResult> => {
  const extra_data: Record<string, unknown> = {
    client_id: clientId,
  }
  if (workflow) {
    extra_data.extra_pnginfo = { workflow }
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, extra_data }),
    })
  } catch {
    return { ok: false, message: "Failed to reach the ComfyUI backend." }
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const fallbackMessage = `Failed to queue prompt (${response.status}).`
    const message = extractErrorMessage(payload) ?? fallbackMessage
    return { ok: false, message, payload }
  }

  return { ok: true, payload }
}

export const interruptPrompt = async ({
  baseUrl,
  promptId,
}: InterruptPromptInput): Promise<InterruptPromptResult> => {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/interrupt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promptId ? { prompt_id: promptId } : {}),
    })
  } catch {
    return { ok: false, message: "Failed to reach the ComfyUI backend." }
  }

  if (!response.ok) {
    return {
      ok: false,
      message: `Failed to interrupt prompt (${response.status}).`,
    }
  }

  return { ok: true }
}
