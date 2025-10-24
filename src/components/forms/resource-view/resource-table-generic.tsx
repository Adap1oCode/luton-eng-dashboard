'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ResourceTableClient from './resource-table-client'
import { BaseViewConfig } from '@/components/data-table/view-defaults'

interface ResourceTableGenericProps<T = any> {
  // Required: The resource endpoint
  endpoint: string
  // Required: The view configuration
  config: BaseViewConfig<T>
  // Required: Initial data from SSR
  initialRows: T[]
  initialTotal: number
  initialPage: number
  initialPageSize: number
  // Optional: Custom query key prefix
  queryKeyPrefix?: string
  // Optional: Custom data transformation
  transformData?: (data: any) => T[]
  // Optional: Custom error handling
  onError?: (error: Error) => void
}

export default function ResourceTableGeneric<T = any>({
  endpoint,
  config,
  initialRows,
  initialTotal,
  initialPage,
  initialPageSize,
  queryKeyPrefix = 'resource',
  transformData,
  onError,
}: ResourceTableGenericProps<T>) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [filters, setFilters] = useState({})

  const queryClient = useQueryClient()

  // Use React Query for data fetching with caching
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [queryKeyPrefix, endpoint, page, pageSize, filters],
    queryFn: async () => {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        raw: 'true',
        ...Object.fromEntries(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ),
      })

      const res = await fetch(`${endpoint}?${qs.toString()}`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch data: ${res.status}`)
      }

      const payload: any = (await res.json()) ?? {}
      const rows = (payload.rows ?? payload.data ?? []) as T[]
      const totalCandidate = Number(payload.total ?? payload.count)
      const total = Number.isFinite(totalCandidate) ? totalCandidate : rows.length

      return { rows, total }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Transform data for the table
  const rows = useMemo(() => {
    if (data?.rows) {
      const transformed = transformData ? transformData(data.rows) : data.rows
      return transformed
    }
    return initialRows
  }, [data?.rows, initialRows, transformData])

  const total = data?.total ?? initialTotal

  // Handle pagination changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // Reset to first page when changing page size
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  // Handle errors
  if (error && onError) {
    onError(error as Error)
  }

  return (
    <ResourceTableClient
      config={config}
      initialRows={rows}
      initialTotal={total}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onFiltersChange={handleFiltersChange}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
    />
  )
}

// Hook for CRUD operations with cache invalidation
export function useResourceMutations(endpoint: string, queryKeyPrefix: string = 'resource') {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`${endpoint}/bulk-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete items')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] })
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create item')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update item')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] })
    },
  })

  return {
    deleteMutation,
    createMutation,
    updateMutation,
  }
}
