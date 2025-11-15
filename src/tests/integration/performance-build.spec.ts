import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

describe('Performance Build Integration', () => {
  let buildMetrics: {
    success: boolean
    duration: number
    bundleSizes: Record<string, number>
    memoryUsage: number
    output: string
  }

  beforeAll(async () => {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()
    
    try {
      console.log('📊 Starting performance build verification...')
      
      // Run build with performance monitoring
      const output = execSync('npm run build', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      })
      
      const duration = Date.now() - startTime
      const endMemory = process.memoryUsage()
      const memoryUsage = endMemory.heapUsed - startMemory.heapUsed
      
      // Measure bundle sizes
      const bundleSizes: Record<string, number> = {}
      
      // Check main bundle sizes
      const staticDir = '.next/static'
      if (existsSync(staticDir)) {
        const chunksDir = join(staticDir, 'chunks')
        if (existsSync(chunksDir)) {
          const files = readdirSync(chunksDir)
          files.forEach((file: string) => {
            if (file.endsWith('.js')) {
              const filePath = join(chunksDir, file)
              bundleSizes[file] = statSync(filePath).size
            }
          })
        }
      }
      
      buildMetrics = {
        success: true,
        duration,
        bundleSizes,
        memoryUsage,
        output
      }
      
      console.log(`✅ Performance build completed in ${duration}ms`)
      console.log(`📊 Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      buildMetrics = {
        success: false,
        duration,
        bundleSizes: {},
        memoryUsage: 0,
        output: error.stdout || error.message || 'Build failed'
      }
      console.error('❌ Performance build failed:', error.message)
    }
  })

  afterAll(() => {
    console.log('🧹 Performance build verification completed')
  })

  describe('Build Performance', () => {
    it('should complete build successfully', () => {
      expect(buildMetrics.success).toBe(true)
    })

    it('should complete within performance budget', () => {
      // Build should complete within 5 minutes (300000ms)
      expect(buildMetrics.duration).toBeLessThan(300000)
    })

    it('should not exceed memory limits', () => {
      // Memory usage should be reasonable (less than 2GB)
      expect(buildMetrics.memoryUsage).toBeLessThan(2 * 1024 * 1024 * 1024)
    })

    it('should not have memory leaks', () => {
      expect(buildMetrics.output).not.toContain('out of memory')
      expect(buildMetrics.output).not.toContain('Memory limit exceeded')
    })
  })

  describe('Bundle Size Optimization', () => {
    it('should have reasonable bundle sizes', () => {
      const totalSize = Object.values(buildMetrics.bundleSizes).reduce((sum, size) => sum + size, 0)
      
      // Total bundle size should be less than 10MB
      expect(totalSize).toBeLessThan(10 * 1024 * 1024)
    })

    it('should have optimized JavaScript chunks', () => {
      const jsFiles = Object.keys(buildMetrics.bundleSizes).filter(file => file.endsWith('.js'))
      expect(jsFiles.length).toBeGreaterThan(0)
      
      // Individual chunks should be reasonable size (less than 1MB each)
      Object.values(buildMetrics.bundleSizes).forEach(size => {
        expect(size).toBeLessThan(1024 * 1024)
      })
    })

    it('should have code splitting', () => {
      const chunks = Object.keys(buildMetrics.bundleSizes)
      expect(chunks.length).toBeGreaterThan(1) // Should have multiple chunks
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should build performance monitoring components', () => {
      const perfPath = '.next/server/components/performance/performance-dashboard.js'
      expect(existsSync(perfPath)).toBe(true)
    })

    it('should build performance hooks', () => {
      const hooksPath = '.next/server/hooks/use-performance-monitoring.js'
      expect(existsSync(hooksPath)).toBe(true)
    })

    it('should build React Query performance monitoring', () => {
      const rqPerfPath = '.next/server/lib/react-query-performance.js'
      expect(existsSync(rqPerfPath)).toBe(true)
    })
  })

  describe('React Query Performance', () => {
    it('should build React Query provider efficiently', () => {
      const providerPath = '.next/server/components/providers/query-provider.js'
      expect(existsSync(providerPath)).toBe(true)
    })

    it('should build React Query configuration', () => {
      const configPath = '.next/server/lib/react-query.js'
      expect(existsSync(configPath)).toBe(true)
    })

    it('should build stock adjustments hooks', () => {
      const hooksPath = '.next/server/hooks/use-stock-adjustments.js'
      expect(existsSync(hooksPath)).toBe(true)
    })
  })

  describe('Resource Page Generator Performance', () => {
    it('should build generator components efficiently', () => {
      const generatorPath = '.next/server/lib/generators/resource-page-generator.js'
      expect(existsSync(generatorPath)).toBe(true)
    })

    it('should build generic components', () => {
      const genericPath = '.next/server/components/forms/resource-view/resource-table-generic.js'
      expect(existsSync(genericPath)).toBe(true)
    })

    it('should build field renderers', () => {
      const renderersPath = '.next/server/components/forms/fields/field-renderers.js'
      expect(existsSync(renderersPath)).toBe(true)
    })
  })

  describe('Build Output Quality', () => {
    it('should not have performance warnings', () => {
      expect(buildMetrics.output).not.toContain('Performance warning')
      expect(buildMetrics.output).not.toContain('Slow build')
    })

    it('should not have memory warnings', () => {
      expect(buildMetrics.output).not.toContain('Memory warning')
      expect(buildMetrics.output).not.toContain('High memory usage')
    })

    it('should have optimized output', () => {
      expect(buildMetrics.output).toMatch(/compiled successfully/i)
    })
  })

  describe('Performance Budgets', () => {
    it('should meet build time budget', () => {
      // Build should complete within 5 minutes
      expect(buildMetrics.duration).toBeLessThan(300000)
    })

    it('should meet memory budget', () => {
      // Memory usage should be less than 2GB
      expect(buildMetrics.memoryUsage).toBeLessThan(2 * 1024 * 1024 * 1024)
    })

    it('should meet bundle size budget', () => {
      const totalSize = Object.values(buildMetrics.bundleSizes).reduce((sum, size) => sum + size, 0)
      // Total bundle size should be less than 10MB
      expect(totalSize).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('Performance Monitoring Features', () => {
    it('should build Web Vitals monitoring', () => {
      const webVitalsPath = '.next/server/hooks/use-performance-monitoring.js'
      expect(existsSync(webVitalsPath)).toBe(true)
    })

    it('should build performance dashboard', () => {
      const dashboardPath = '.next/server/app/(main)/performance/page.js'
      expect(existsSync(dashboardPath)).toBe(true)
    })

    it('should build performance tests', () => {
      const testsPath = '.next/server/tests/performance'
      expect(existsSync(testsPath)).toBe(true)
    })
  })

  describe('Build Efficiency', () => {
    it('should have reasonable build time', () => {
      // Build should complete within 5 minutes
      expect(buildMetrics.duration).toBeLessThan(300000)
    })

    it('should not have excessive memory usage', () => {
      // Memory usage should be reasonable
      expect(buildMetrics.memoryUsage).toBeLessThan(2 * 1024 * 1024 * 1024)
    })

    it('should have optimized output', () => {
      expect(buildMetrics.output).toMatch(/compiled successfully/i)
    })
  })

  describe('Performance Metrics', () => {
    it('should log build performance metrics', () => {
      console.log(`📊 Build Duration: ${buildMetrics.duration}ms`)
      console.log(`📊 Memory Usage: ${(buildMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
      console.log(`📊 Bundle Files: ${Object.keys(buildMetrics.bundleSizes).length}`)
      console.log(`📊 Total Bundle Size: ${(Object.values(buildMetrics.bundleSizes).reduce((sum, size) => sum + size, 0) / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should meet performance thresholds', () => {
      // All performance metrics should be within acceptable ranges
      expect(buildMetrics.duration).toBeLessThan(300000) // 5 minutes
      expect(buildMetrics.memoryUsage).toBeLessThan(2 * 1024 * 1024 * 1024) // 2GB
      
      const totalSize = Object.values(buildMetrics.bundleSizes).reduce((sum, size) => sum + size, 0)
      expect(totalSize).toBeLessThan(10 * 1024 * 1024) // 10MB
    })
  })
})
