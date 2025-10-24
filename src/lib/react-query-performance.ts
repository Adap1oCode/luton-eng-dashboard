import { QueryClient } from '@tanstack/react-query'

// Performance metrics for React Query
export interface ReactQueryMetrics {
  cacheHits: number
  cacheMisses: number
  queryCount: number
  mutationCount: number
  averageQueryTime: number
  averageMutationTime: number
  staleQueries: number
  backgroundRefetches: number
}

// Performance monitoring for React Query
export class ReactQueryPerformanceMonitor {
  private metrics: ReactQueryMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    queryCount: 0,
    mutationCount: 0,
    averageQueryTime: 0,
    averageMutationTime: 0,
    staleQueries: 0,
    backgroundRefetches: 0,
  }

  private queryTimes: number[] = []
  private mutationTimes: number[] = []

  constructor(private queryClient: QueryClient) {
    this.setupMonitoring()
  }

  private setupMonitoring() {
    // Monitor query cache
    this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'added') {
        this.metrics.queryCount++
        console.log('📊 React Query: Query added', event.query.queryKey)
      }
      
      if (event.type === 'updated') {
        if (event.query.state.isStale) {
          this.metrics.staleQueries++
          console.log('📊 React Query: Query became stale', event.query.queryKey)
        }
      }
    })

    // Monitor mutations
    this.queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'added') {
        this.metrics.mutationCount++
        console.log('📊 React Query: Mutation added', event.mutation.options.mutationKey)
      }
    })
  }

  // Track query performance
  trackQuery<T>(queryKey: any[], queryFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    return queryFn().then(
      (result) => {
        const duration = Date.now() - startTime
        this.queryTimes.push(duration)
        this.updateAverageQueryTime()
        
        // Check if this was a cache hit or miss
        const query = this.queryClient.getQueryData(queryKey)
        if (query) {
          this.metrics.cacheHits++
          console.log('📊 React Query: Cache HIT', queryKey, `${duration}ms`)
        } else {
          this.metrics.cacheMisses++
          console.log('📊 React Query: Cache MISS', queryKey, `${duration}ms`)
        }
        
        return result
      },
      (error) => {
        const duration = Date.now() - startTime
        console.log('📊 React Query: Query ERROR', queryKey, `${duration}ms`, error)
        throw error
      }
    )
  }

  // Track mutation performance
  trackMutation<T>(mutationKey: any[], mutationFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    return mutationFn().then(
      (result) => {
        const duration = Date.now() - startTime
        this.mutationTimes.push(duration)
        this.updateAverageMutationTime()
        
        console.log('📊 React Query: Mutation SUCCESS', mutationKey, `${duration}ms`)
        return result
      },
      (error) => {
        const duration = Date.now() - startTime
        console.log('📊 React Query: Mutation ERROR', mutationKey, `${duration}ms`, error)
        throw error
      }
    )
  }

  // Track background refetch
  trackBackgroundRefetch(queryKey: any[]) {
    this.metrics.backgroundRefetches++
    console.log('📊 React Query: Background refetch', queryKey)
  }

  private updateAverageQueryTime() {
    if (this.queryTimes.length > 0) {
      this.metrics.averageQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
    }
  }

  private updateAverageMutationTime() {
    if (this.mutationTimes.length > 0) {
      this.metrics.averageMutationTime = this.mutationTimes.reduce((a, b) => a + b, 0) / this.mutationTimes.length
    }
  }

  // Get current metrics
  getMetrics(): ReactQueryMetrics {
    return { ...this.metrics }
  }

  // Get cache hit rate
  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0
  }

  // Get performance summary
  getPerformanceSummary(): string {
    const hitRate = this.getCacheHitRate()
    return `
📊 React Query Performance Summary:
  Queries: ${this.metrics.queryCount}
  Mutations: ${this.metrics.mutationCount}
  Cache Hit Rate: ${hitRate.toFixed(1)}%
  Average Query Time: ${this.metrics.averageQueryTime.toFixed(1)}ms
  Average Mutation Time: ${this.metrics.averageMutationTime.toFixed(1)}ms
  Stale Queries: ${this.metrics.staleQueries}
  Background Refetches: ${this.metrics.backgroundRefetches}
    `.trim()
  }

  // Reset metrics
  reset() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      queryCount: 0,
      mutationCount: 0,
      averageQueryTime: 0,
      averageMutationTime: 0,
      staleQueries: 0,
      backgroundRefetches: 0,
    }
    this.queryTimes = []
    this.mutationTimes = []
  }
}

// Create global performance monitor instance
let performanceMonitor: ReactQueryPerformanceMonitor | null = null

export function getReactQueryPerformanceMonitor(queryClient: QueryClient): ReactQueryPerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new ReactQueryPerformanceMonitor(queryClient)
  }
  return performanceMonitor
}

// Performance budgets for React Query
export const REACT_QUERY_BUDGETS = {
  CACHE_HIT_RATE: 80, // 80% cache hit rate
  AVERAGE_QUERY_TIME: 500, // 500ms average query time
  AVERAGE_MUTATION_TIME: 1000, // 1s average mutation time
  MAX_STALE_QUERIES: 10, // Max 10 stale queries
}

// Check if React Query metrics meet performance budgets
export function checkReactQueryBudgets(metrics: ReactQueryMetrics): {
  passed: boolean
  violations: string[]
} {
  const violations: string[] = []
  const hitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100

  if (hitRate < REACT_QUERY_BUDGETS.CACHE_HIT_RATE) {
    violations.push(`Cache Hit Rate: ${hitRate.toFixed(1)}% < ${REACT_QUERY_BUDGETS.CACHE_HIT_RATE}%`)
  }

  if (metrics.averageQueryTime > REACT_QUERY_BUDGETS.AVERAGE_QUERY_TIME) {
    violations.push(`Average Query Time: ${metrics.averageQueryTime.toFixed(1)}ms > ${REACT_QUERY_BUDGETS.AVERAGE_QUERY_TIME}ms`)
  }

  if (metrics.averageMutationTime > REACT_QUERY_BUDGETS.AVERAGE_MUTATION_TIME) {
    violations.push(`Average Mutation Time: ${metrics.averageMutationTime.toFixed(1)}ms > ${REACT_QUERY_BUDGETS.AVERAGE_MUTATION_TIME}ms`)
  }

  if (metrics.staleQueries > REACT_QUERY_BUDGETS.MAX_STALE_QUERIES) {
    violations.push(`Stale Queries: ${metrics.staleQueries} > ${REACT_QUERY_BUDGETS.MAX_STALE_QUERIES}`)
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}
