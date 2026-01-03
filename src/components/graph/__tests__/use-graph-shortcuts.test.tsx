import { fireEvent, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useGraphShortcuts } from "@/components/graph/use-graph-shortcuts"

describe("useGraphShortcuts", () => {
  it("calls onSave when pressing ctrl+s", () => {
    const onSave = vi.fn()
    const onQueue = vi.fn()

    renderHook(() => useGraphShortcuts({ onSave, onQueue }))

    fireEvent.keyDown(window, { key: "s", ctrlKey: true })
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onQueue).not.toHaveBeenCalled()
  })

  it("calls onSave when pressing meta+s (mac)", () => {
    const onSave = vi.fn()
    const onQueue = vi.fn()

    renderHook(() => useGraphShortcuts({ onSave, onQueue }))

    fireEvent.keyDown(window, { key: "s", metaKey: true })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("calls onQueue when pressing ctrl+enter", () => {
    const onSave = vi.fn()
    const onQueue = vi.fn()

    renderHook(() => useGraphShortcuts({ onSave, onQueue }))

    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true })
    expect(onQueue).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it("does not trigger when typing in an input", () => {
    const onSave = vi.fn()
    const onQueue = vi.fn()

    renderHook(() => useGraphShortcuts({ onSave, onQueue }))

    const input = document.createElement("input")
    document.body.appendChild(input)
    input.focus()

    fireEvent.keyDown(input, { key: "s", ctrlKey: true })

    expect(onSave).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })
})
