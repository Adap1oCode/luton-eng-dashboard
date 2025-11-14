import { QueryClient } from '@tanstack/react-query'
import { getReactQueryPerformanceMonitor } from './react-query-performance'

// React Query configuration optimized for your use case
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus (saves bandwidth)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect (saves bandwidth)
      refetchOnReconnect: false,
      // Don't refetch on mount by default when initialData is provided (SSR pattern)
      // Components can override this per-query if needed
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
})

// Query keys for consistent caching
export const queryKeys = {
  stockAdjustments: {
    all: ['stock-adjustments'] as const,
    lists: () => [...queryKeys.stockAdjustments.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.stockAdjustments.lists(), filters] as const,
    details: () => [...queryKeys.stockAdjustments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.stockAdjustments.details(), id] as const,
  },
  // Add more resource keys as needed
  resources: {
    all: ['resources'] as const,
    list: (resource: string, filters: Record<string, any>) => [...queryKeys.resources.all, resource, filters] as const,
  },
} as const

// Initialize performance monitoring
export const performanceMonitor = getReactQueryPerformanceMonitor(queryClient)
