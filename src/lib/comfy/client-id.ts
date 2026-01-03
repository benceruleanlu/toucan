const CLIENT_ID_STORAGE_KEY = "toucan:client-id:v1"

const createClientId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const getComfyClientId = () => {
  if (typeof window === "undefined") {
    return createClientId()
  }

  try {
    const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existing) {
      return existing
    }
    const next = createClientId()
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, next)
    return next
  } catch {
    return createClientId()
  }
}
