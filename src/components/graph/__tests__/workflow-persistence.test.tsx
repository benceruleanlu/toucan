import { renderHook } from "@testing-library/react"
import type {
  Edge,
  ReactFlowInstance,
  ReactFlowJsonObject,
} from "@xyflow/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import testGraphSnapshot from "@/components/graph/__tests__/test-graph.json"
import type { CanvasNode } from "@/components/graph/comfy-node"
import { useWorkflowPersistence } from "@/components/graph/use-workflow-persistence"
import { WORKFLOW_SNAPSHOT_VERSION } from "@/lib/comfy/workflow-snapshot"

const WORKFLOW_STORAGE_KEY = "toucan:workflow:v1"

const graphFromFixture = testGraphSnapshot.graph as ReactFlowJsonObject<
  CanvasNode,
  Edge
>

const createInstance = (
  graph: ReactFlowJsonObject<CanvasNode, Edge>,
  setViewport: ReactFlowInstance<CanvasNode, Edge>["setViewport"] = vi.fn(),
) => ({
  instance: {
    toObject: () => graph,
    setViewport,
  } as ReactFlowInstance<CanvasNode, Edge>,
  setViewport,
})

describe("workflow persistence", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("restores the workflow from localStorage", () => {
    const graph = graphFromFixture
    window.localStorage.setItem(
      WORKFLOW_STORAGE_KEY,
      JSON.stringify(testGraphSnapshot),
    )

    const setNodes = vi.fn()
    const setEdges = vi.fn()
    const { instance, setViewport } = createInstance(graph)
    const instanceRef = { current: instance }

    const { result } = renderHook(() =>
      useWorkflowPersistence({
        instanceRef,
        setNodes,
        setEdges,
      }),
    )

    result.current.restoreWorkflow(instance)

    expect(setNodes).toHaveBeenCalledWith(graph.nodes)
    expect(setEdges).toHaveBeenCalledWith(graph.edges)
    expect(setViewport).toHaveBeenCalledWith(graph.viewport)
  })

  it("does not restore if the stored data is invalid JSON", () => {
    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, "{ invalid json }")
    const setNodes = vi.fn()
    const setEdges = vi.fn()
    const { instance, setViewport } = createInstance(graphFromFixture)
    const instanceRef = { current: instance }

    const { result } = renderHook(() =>
      useWorkflowPersistence({ instanceRef, setNodes, setEdges }),
    )

    result.current.restoreWorkflow(instance)

    expect(setNodes).not.toHaveBeenCalled()
    expect(setEdges).not.toHaveBeenCalled()
    expect(setViewport).not.toHaveBeenCalled()
  })

  it("does not restore if the snapshot version is mismatching", () => {
    const invalidSnapshot = { ...testGraphSnapshot, version: 999 }
    window.localStorage.setItem(
      WORKFLOW_STORAGE_KEY,
      JSON.stringify(invalidSnapshot),
    )

    const setNodes = vi.fn()
    const setEdges = vi.fn()
    const { instance, setViewport } = createInstance(graphFromFixture)
    const instanceRef = { current: instance }

    const { result } = renderHook(() =>
      useWorkflowPersistence({ instanceRef, setNodes, setEdges }),
    )

    result.current.restoreWorkflow(instance)

    expect(setNodes).not.toHaveBeenCalled()
    expect(setEdges).not.toHaveBeenCalled()
    expect(setViewport).not.toHaveBeenCalled()
  })

  it("restores only once even if called multiple times", () => {
    window.localStorage.setItem(
      WORKFLOW_STORAGE_KEY,
      JSON.stringify(testGraphSnapshot),
    )

    const setNodes = vi.fn()
    const setEdges = vi.fn()
    const { instance } = createInstance(graphFromFixture)
    const instanceRef = { current: instance }

    const { result } = renderHook(() =>
      useWorkflowPersistence({ instanceRef, setNodes, setEdges }),
    )

    result.current.restoreWorkflow(instance)
    result.current.restoreWorkflow(instance)

    expect(setNodes).toHaveBeenCalledTimes(1)
    expect(setEdges).toHaveBeenCalledTimes(1)
  })

  it("saves the workflow directly via API", () => {
    const graph = graphFromFixture
    const { instance } = createInstance(graph)
    const instanceRef = { current: instance }

    const { result } = renderHook(() =>
      useWorkflowPersistence({
        instanceRef,
        setNodes: vi.fn(),
        setEdges: vi.fn(),
      }),
    )

    result.current.saveWorkflow()

    const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.graph.nodes).toEqual(graph.nodes)
  })
})
