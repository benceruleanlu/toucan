"use client"

import * as React from "react"

type CommandPaletteOpenState = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const useCommandPaletteOpen = (): CommandPaletteOpenState => {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || open) {
        return
      }

      if (event.code !== "Space") {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return
      }

      event.preventDefault()
      setOpen(true)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  return { open, setOpen }
}
