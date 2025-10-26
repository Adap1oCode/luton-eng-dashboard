import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkPerformanceBudgets, PERFORMANCE_BUDGETS } from '@/hooks/use-performance-monitoring'

// Mock web-vitals
vi.mock('web-vitals', () => ({
  getCLS: vi.fn((callback) => callback({ value: 0.05 })),
  getFID: vi.fn((callback) => callback({ value: 50 })),
  getFCP: vi.fn((callback) => callback({ value: 1200 })),
  getLCP: vi.fn((callback) => callback({ value: 2000 })),
  getTTFB: vi.fn((callback) => callback({ value: 600 })),
}))

describe('Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Performance Budget Functions', () => {
    it('should export performance budget constants', () => {
      expect(PERFORMANCE_BUDGETS.CLS).toBe(0.1)
      expect(PERFORMANCE_BUDGETS.FID).toBe(100)
      expect(PERFORMANCE_BUDGETS.FCP).toBe(1800)
      expect(PERFORMANCE_BUDGETS.LCP).toBe(2500)
      expect(PERFORMANCE_BUDGETS.TTFB).toBe(800)
      expect(PERFORMANCE_BUDGETS.API_RESPONSE_TIME).toBe(1000)
      expect(PERFORMANCE_BUDGETS.RENDER_TIME).toBe(100)
      expect(PERFORMANCE_BUDGETS.MEMORY_USAGE).toBe(50)
    })

    it('should export checkPerformanceBudgets function', () => {
      expect(typeof checkPerformanceBudgets).toBe('function')
    })
  })

  describe('Performance Budgets', () => {
    it('should pass when all metrics are within budget', () => {
      const goodMetrics = {
        cls: 0.05,
        fid: 50,
        fcp: 1200,
        lcp: 2000,
        ttfb: 600,
        apiResponseTime: 500,
        cacheHitRate: 85,
        renderTime: 50,
        memoryUsage: 30,
      }

      const result = checkPerformanceBudgets(goodMetrics)
      
      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should fail when metrics exceed budget', () => {
      const badMetrics = {
        cls: 0.3, // Exceeds 0.1
        fid: 400, // Exceeds 100
        fcp: 4000, // Exceeds 1800
        lcp: 5000, // Exceeds 2500
        ttfb: 2000, // Exceeds 800
        apiResponseTime: 2000, // Exceeds 1000
        cacheHitRate: 50, // Below 80
        renderTime: 200, // Exceeds 100
        memoryUsage: 100, // Exceeds 50
      }

      const result = checkPerformanceBudgets(badMetrics)
      
      expect(result.passed).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it('should handle null metrics gracefully', () => {
      const nullMetrics = {
        cls: null,
        fid: null,
        fcp: null,
        lcp: null,
        ttfb: null,
        apiResponseTime: null,
        cacheHitRate: null,
        renderTime: null,
        memoryUsage: null,
      }

      const result = checkPerformanceBudgets(nullMetrics)
      
      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })
  })

  describe('Performance Budget Constants', () => {
    it('should have reasonable budget thresholds', () => {
      expect(PERFORMANCE_BUDGETS.CLS).toBe(0.1)
      expect(PERFORMANCE_BUDGETS.FID).toBe(100)
      expect(PERFORMANCE_BUDGETS.FCP).toBe(1800)
      expect(PERFORMANCE_BUDGETS.LCP).toBe(2500)
      expect(PERFORMANCE_BUDGETS.TTFB).toBe(800)
      expect(PERFORMANCE_BUDGETS.API_RESPONSE_TIME).toBe(1000)
      expect(PERFORMANCE_BUDGETS.RENDER_TIME).toBe(100)
      expect(PERFORMANCE_BUDGETS.MEMORY_USAGE).toBe(50)
    })
  })
})
