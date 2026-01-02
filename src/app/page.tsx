"use client";

import * as React from "react";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const stubbedNodes = [
  "User Profile",
  "Webhook Listener",
  "Data Transformer",
  "Error Handler",
  "Export to CSV",
];

export default function Home() {
  const [commandOpen, setCommandOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (commandOpen) {
        return;
      }

      if (event.code !== "Space") {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      event.preventDefault();
      setCommandOpen(true);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [commandOpen]);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <ReactFlow>
        <Background />
        <Controls />
      </ReactFlow>
      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Search nodes"
        description="Search for nodes to add to the canvas."
      >
        <CommandInput placeholder="Search nodes..." />
        <CommandList>
          <CommandEmpty>No nodes found.</CommandEmpty>
          <CommandGroup heading="Suggested nodes">
            {stubbedNodes.slice(0, 3).map((node) => (
              <CommandItem key={node}>{node}</CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="More placeholders">
            {stubbedNodes.slice(3).map((node) => (
              <CommandItem key={node}>{node}</CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
