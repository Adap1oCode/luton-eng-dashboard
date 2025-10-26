import { useEffect, useRef } from 'react'
import { onCLS, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals'

// Performance metrics interface
export interface PerformanceMetrics {
  // Core Web Vitals
  cls: number | null // Cumulative Layout Shift
  fid: number | null // First Input Delay
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  ttfb: number | null // Time to First Byte
  
  // Custom metrics
  apiResponseTime: number | null
  cacheHitRate: number | null
  renderTime: number | null
  memoryUsage: number | null
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const metricsRef = useRef<PerformanceMetrics>({
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    apiResponseTime: null,
    cacheHitRate: null,
    renderTime: null,
    memoryUsage: null,
  })

  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // Measure Core Web Vitals
    onCLS((metric: Metric) => {
      metricsRef.current.cls = metric.value
      console.log('📊 CLS:', metric.value)
    })

    // FID is deprecated in newer web-vitals versions
    // onFID((metric: Metric) => {
    //   metricsRef.current.fid = metric.value
    //   console.log('📊 FID:', metric.value)
    // })

    onFCP((metric: Metric) => {
      metricsRef.current.fcp = metric.value
      console.log('📊 FCP:', metric.value)
    })

    onLCP((metric: Metric) => {
      metricsRef.current.lcp = metric.value
      console.log('📊 LCP:', metric.value)
    })

    onTTFB((metric: Metric) => {
      metricsRef.current.ttfb = metric.value
      console.log('📊 TTFB:', metric.value)
    })

    // Measure render time
    const renderTime = Date.now() - startTimeRef.current
    metricsRef.current.renderTime = renderTime
    console.log('📊 Render Time:', renderTime + 'ms')

    // Measure memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
      console.log('📊 Memory Usage:', metricsRef.current.memoryUsage + 'MB')
    }

  }, [])

  // Function to measure API response time
  const measureApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
    const startTime = Date.now()
    try {
      const result = await apiCall()
      const responseTime = Date.now() - startTime
      metricsRef.current.apiResponseTime = responseTime
      console.log('📊 API Response Time:', responseTime + 'ms')
      return result
    } catch (error) {
      const responseTime = Date.now() - startTime
      console.log('📊 API Error Time:', responseTime + 'ms')
      throw error
    }
  }

  // Function to measure cache hit rate
  const measureCacheHit = (hit: boolean) => {
    // This would be implemented with actual cache tracking
    console.log('📊 Cache Hit:', hit)
  }

  // Function to get current metrics
  const getMetrics = (): PerformanceMetrics => {
    return { ...metricsRef.current }
  }

  // Function to log performance summary
  const logPerformanceSummary = () => {
    const metrics = getMetrics()
    console.group('🚀 Performance Summary')
    console.log('Core Web Vitals:')
    console.log(`  CLS: ${metrics.cls?.toFixed(3) || 'N/A'}`)
    console.log(`  FID: ${metrics.fid?.toFixed(1) || 'N/A'}ms`)
    console.log(`  FCP: ${metrics.fcp?.toFixed(1) || 'N/A'}ms`)
    console.log(`  LCP: ${metrics.lcp?.toFixed(1) || 'N/A'}ms`)
    console.log(`  TTFB: ${metrics.ttfb?.toFixed(1) || 'N/A'}ms`)
    console.log('Custom Metrics:')
    console.log(`  API Response: ${metrics.apiResponseTime || 'N/A'}ms`)
    console.log(`  Render Time: ${metrics.renderTime || 'N/A'}ms`)
    console.log(`  Memory Usage: ${metrics.memoryUsage?.toFixed(1) || 'N/A'}MB`)
    console.groupEnd()
  }

  return {
    measureApiCall,
    measureCacheHit,
    getMetrics,
    logPerformanceSummary,
  }
}

// Performance budget thresholds
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals thresholds
  CLS: 0.1, // Good: ≤0.1, Needs Improvement: ≤0.25, Poor: >0.25
  FID: 100, // Good: ≤100ms, Needs Improvement: ≤300ms, Poor: >300ms
  FCP: 1800, // Good: ≤1.8s, Needs Improvement: ≤3.0s, Poor: >3.0s
  LCP: 2500, // Good: ≤2.5s, Needs Improvement: ≤4.0s, Poor: >4.0s
  TTFB: 800, // Good: ≤800ms, Needs Improvement: ≤1800ms, Poor: >1800ms
  
  // Custom thresholds
  API_RESPONSE_TIME: 1000, // 1 second
  RENDER_TIME: 100, // 100ms
  MEMORY_USAGE: 50, // 50MB
}

// Function to check if metrics meet performance budgets
export function checkPerformanceBudgets(metrics: PerformanceMetrics): {
  passed: boolean
  violations: string[]
} {
  const violations: string[] = []

  if (metrics.cls !== null && metrics.cls > PERFORMANCE_BUDGETS.CLS) {
    violations.push(`CLS: ${metrics.cls.toFixed(3)} > ${PERFORMANCE_BUDGETS.CLS}`)
  }

  if (metrics.fid !== null && metrics.fid > PERFORMANCE_BUDGETS.FID) {
    violations.push(`FID: ${metrics.fid.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.FID}ms`)
  }

  if (metrics.fcp !== null && metrics.fcp > PERFORMANCE_BUDGETS.FCP) {
    violations.push(`FCP: ${metrics.fcp.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.FCP}ms`)
  }

  if (metrics.lcp !== null && metrics.lcp > PERFORMANCE_BUDGETS.LCP) {
    violations.push(`LCP: ${metrics.lcp.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.LCP}ms`)
  }

  if (metrics.ttfb !== null && metrics.ttfb > PERFORMANCE_BUDGETS.TTFB) {
    violations.push(`TTFB: ${metrics.ttfb.toFixed(1)}ms > ${PERFORMANCE_BUDGETS.TTFB}ms`)
  }

  if (metrics.apiResponseTime !== null && metrics.apiResponseTime > PERFORMANCE_BUDGETS.API_RESPONSE_TIME) {
    violations.push(`API Response: ${metrics.apiResponseTime}ms > ${PERFORMANCE_BUDGETS.API_RESPONSE_TIME}ms`)
  }

  if (metrics.renderTime !== null && metrics.renderTime > PERFORMANCE_BUDGETS.RENDER_TIME) {
    violations.push(`Render Time: ${metrics.renderTime}ms > ${PERFORMANCE_BUDGETS.RENDER_TIME}ms`)
  }

  if (metrics.memoryUsage !== null && metrics.memoryUsage > PERFORMANCE_BUDGETS.MEMORY_USAGE) {
    violations.push(`Memory Usage: ${metrics.memoryUsage.toFixed(1)}MB > ${PERFORMANCE_BUDGETS.MEMORY_USAGE}MB`)
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}
