import * as React from "react"
import { API_BASE } from "@/components/graph/constants"
import {
  buildNodeCatalog,
  type NodeCatalogEntry,
  type NodeSchemaMap,
  normalizeObjectInfo,
  type RawObjectInfoMap,
} from "@/lib/comfy/objectInfo"

type NodeCatalogState = {
  nodeDefs: NodeCatalogEntry[]
  nodeSchemas: NodeSchemaMap
  loading: boolean
  error: string | null
}

export const useNodeCatalog = (): NodeCatalogState => {
  const [nodeDefs, setNodeDefs] = React.useState<NodeCatalogEntry[]>([])
  const [nodeSchemas, setNodeSchemas] = React.useState<NodeSchemaMap>({})
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    const loadNodeDefs = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/object_info`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load nodes (${response.status})`)
        }

        const data = (await response.json()) as RawObjectInfoMap
        const normalized = normalizeObjectInfo(data)
        const catalog = buildNodeCatalog(normalized).sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        )
        setNodeSchemas(normalized)
        setNodeDefs(catalog)
      } catch (fetchError) {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load nodes.",
        )
      } finally {
        setLoading(false)
      }
    }

    loadNodeDefs()
    return () => controller.abort()
  }, [])

  return { nodeDefs, nodeSchemas, loading, error }
}
