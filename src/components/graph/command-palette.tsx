"use client"

import * as React from "react"
import { MAX_RESULTS_WHEN_EMPTY } from "@/components/graph/constants"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { NodeCatalogEntry } from "@/lib/comfy/objectInfo"

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeDefs: NodeCatalogEntry[]
  emptyStateText: string
  onSelectNode: (node: NodeCatalogEntry) => void
}

export function CommandPalette({
  open,
  onOpenChange,
  nodeDefs,
  emptyStateText,
  onSelectNode,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  const visibleNodes = React.useMemo(() => {
    if (query.trim().length === 0) {
      return nodeDefs.slice(0, MAX_RESULTS_WHEN_EMPTY)
    }
    return nodeDefs
  }, [nodeDefs, query])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search nodes"
      description="Search for nodes to add to the canvas."
    >
      <CommandInput
        value={query}
        onValueChange={(value) => setQuery(value)}
        placeholder="Search nodes..."
      />
      <CommandList>
        <CommandEmpty>{emptyStateText}</CommandEmpty>
        <CommandGroup heading="Nodes">
          {visibleNodes.map((node) => (
            <CommandItem
              key={node.name}
              value={node.searchValue}
              onSelect={() => onSelectNode(node)}
            >
              <div className="flex flex-col">
                <span>{node.displayName}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
