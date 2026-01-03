import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import { CommandPalette } from "@/components/graph/command-palette"
import { useCommandPaletteOpen } from "@/components/graph/use-command-palette-open"

function CommandPaletteHarness() {
  const { open, setOpen } = useCommandPaletteOpen()

  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      nodeDefs={[]}
      emptyStateText="No nodes found."
      onSelectNode={() => {}}
    />
  )
}

describe("command palette", () => {
  beforeAll(() => {
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
  })

  it("shows the node search box when pressing space", async () => {
    render(<CommandPaletteHarness />)

    expect(screen.queryByPlaceholderText("Search nodes...")).toBeNull()

    fireEvent.keyDown(document, { code: "Space", key: " " })

    expect(await screen.findByPlaceholderText("Search nodes...")).toBeTruthy()
  })
})
