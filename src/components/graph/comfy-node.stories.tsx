import type { Meta, StoryObj } from "@storybook/react"
import { ReactFlowProvider, type NodeProps } from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import "../../app/globals.css"

import {
  ComfyNode,
  NodeSchemaContext,
  type ComfyFlowNode,
} from "@/components/graph/comfy-node"
import {
  ExecutionStateContext,
  type ExecutionState,
  type FileOutput,
} from "@/components/graph/execution-context"
import type { NodeSchemaMap } from "@/lib/comfy/objectInfo"

const nodeId = "output-node-1"
const nodeType = "PreviewImage"

const nodeSchemas: NodeSchemaMap = {
  [nodeType]: {
    name: nodeType,
    displayName: "Preview Image",
    description: "Shows image outputs from a workflow.",
    category: "Output",
    inputs: [],
    outputs: [
      {
        name: "images",
        type: "IMAGE",
        isList: true,
      },
    ],
    isOutputNode: true,
    searchValue: "Preview Image Output",
  },
}

const makeSvgDataUrl = (label: string, fill: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect width="100%" height="100%" fill="${fill}" />
      <text x="50%" y="50%" font-family="ui-monospace, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="18" text-anchor="middle" dominant-baseline="middle" fill="#0f172a">${label}</text>
    </svg>`,
  )}`

const outputImages: FileOutput[] = [
  {
    filename: "output-1.png",
    url: makeSvgDataUrl("Output 1", "#e2e8f0"),
    previewUrl: makeSvgDataUrl("Output 1", "#f8fafc"),
  },
  {
    filename: "output-2.png",
    url: makeSvgDataUrl("Output 2", "#dbeafe"),
    previewUrl: makeSvgDataUrl("Output 2", "#eff6ff"),
  },
  {
    filename: "output-3.png",
    url: makeSvgDataUrl("Output 3", "#fce7f3"),
    previewUrl: makeSvgDataUrl("Output 3", "#fdf2f8"),
  },
]

const executionState: ExecutionState = {
  phase: "idle",
  promptId: null,
  currentNodeId: null,
  queueRemaining: null,
  startedAt: null,
  nodeStatuses: { [nodeId]: "completed" },
  nodeProgress: {},
  nodeErrors: {},
  nodeOutputs: {
    [nodeId]: {
      images: outputImages,
    },
  },
}

const baseArgs = {
  id: nodeId,
  type: "comfy",
  data: {
    label: "Preview Image",
    nodeType,
    widgetValues: {},
    widgetControlValues: {},
  },
  dragging: false,
  zIndex: 0,
  selectable: true,
  deletable: true,
  selected: false,
  draggable: true,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
} satisfies NodeProps<ComfyFlowNode>

const meta = {
  title: "Graph/ComfyNode",
  component: ComfyNode,
  args: baseArgs,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <NodeSchemaContext.Provider value={nodeSchemas}>
          <ExecutionStateContext.Provider value={executionState}>
            <div className="bg-slate-100 p-6">
              <Story />
            </div>
          </ExecutionStateContext.Provider>
        </NodeSchemaContext.Provider>
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof ComfyNode>

export default meta

type Story = StoryObj<typeof ComfyNode>

export const OutputCarousel: Story = {}
