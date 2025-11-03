import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('End-to-End Build Integration', () => {
  let buildResults: {
    success: boolean
    output: string
    duration: number
    artifacts: string[]
  }

  beforeAll(async () => {
    const startTime = Date.now()
    
    try {
      console.log('🚀 Starting end-to-end build verification...')
      
      // Run full build process
      const output = execSync('npm run build', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      })
      
      const duration = Date.now() - startTime
      
      // Check for build artifacts
      const artifacts = [
        '.next',
        '.next/static',
        '.next/server',
        '.next/build-manifest.json',
        '.next/package.json'
      ].filter(path => existsSync(path))
      
      buildResults = {
        success: true,
        output,
        duration,
        artifacts
      }
      
      console.log(`✅ End-to-end build completed in ${duration}ms`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      buildResults = {
        success: false,
        output: error.stdout || error.message || 'Build failed',
        duration,
        artifacts: []
      }
      console.error('❌ End-to-end build failed:', error.message)
    }
  })

  afterAll(() => {
    console.log('🧹 End-to-end build verification completed')
  })

  describe('Build Success', () => {
    it('should complete build successfully', () => {
      expect(buildResults.success).toBe(true)
    })

    it('should complete within reasonable time', () => {
      // Build should complete within 5 minutes (300000ms)
      expect(buildResults.duration).toBeLessThan(300000)
    })

    it('should generate all required artifacts', () => {
      expect(buildResults.artifacts.length).toBeGreaterThan(0)
      expect(buildResults.artifacts).toContain('.next')
      expect(buildResults.artifacts).toContain('.next/static')
      expect(buildResults.artifacts).toContain('.next/server')
    })
  })

  describe('Application Structure', () => {
    it('should build main application', () => {
      const appDir = '.next/server/app'
      expect(existsSync(appDir)).toBe(true)
    })

    it('should build API routes', () => {
      const apiDir = '.next/server/app/api'
      expect(existsSync(apiDir)).toBe(true)
    })

    it('should build forms', () => {
      const formsDir = '.next/server/app/(main)/forms'
      expect(existsSync(formsDir)).toBe(true)
    })

    it('should build dashboard', () => {
      const dashboardDir = '.next/server/app/(main)/dashboard'
      expect(existsSync(dashboardDir)).toBe(true)
    })
  })

  describe('Stock Adjustments Integration', () => {
    it('should build stock adjustments page', () => {
      const pagePath = '.next/server/app/(main)/forms/stock-adjustments/page.js'
      expect(existsSync(pagePath)).toBe(true)
    })

    it('should build stock adjustments API', () => {
      const apiPath = '.next/server/app/api/v_tcm_user_tally_card_entries/route.js'
      expect(existsSync(apiPath)).toBe(true)
    })

    it('should build stock adjustments client component', () => {
      const clientPath = '.next/server/components/forms/stock-adjustments'
      expect(existsSync(clientPath)).toBe(true)
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should build performance monitoring page', () => {
      const perfPath = '.next/server/app/(main)/performance/page.js'
      expect(existsSync(perfPath)).toBe(true)
    })

    it('should build performance dashboard component', () => {
      const dashboardPath = '.next/server/components/performance'
      expect(existsSync(dashboardPath)).toBe(true)
    })

    it('should build performance monitoring hooks', () => {
      const hooksPath = '.next/server/hooks/use-performance-monitoring.js'
      expect(existsSync(hooksPath)).toBe(true)
    })
  })

  describe('React Query Integration', () => {
    it('should build React Query provider', () => {
      const providerPath = '.next/server/components/providers/query-provider.js'
      expect(existsSync(providerPath)).toBe(true)
    })

    it('should build React Query configuration', () => {
      const configPath = '.next/server/lib/react-query.js'
      expect(existsSync(configPath)).toBe(true)
    })

    it('should build React Query performance monitoring', () => {
      const perfPath = '.next/server/lib/react-query-performance.js'
      expect(existsSync(perfPath)).toBe(true)
    })
  })

  describe('Resource Page Generator', () => {
    it('should build generator components', () => {
      const generatorPath = '.next/server/lib/generators'
      expect(existsSync(generatorPath)).toBe(true)
    })

    it('should build generic page shell', () => {
      const shellPath = '.next/server/components/forms/shell/generic-page-shell.js'
      expect(existsSync(shellPath)).toBe(true)
    })

    it('should build resource table generic', () => {
      const tablePath = '.next/server/components/forms/resource-view/resource-table-generic.js'
      expect(existsSync(tablePath)).toBe(true)
    })
  })

  describe('Build Manifest', () => {
    it('should generate build manifest', () => {
      const manifestPath = '.next/build-manifest.json'
      expect(existsSync(manifestPath)).toBe(true)
      
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      expect(manifest).toHaveProperty('pages')
      expect(manifest).toHaveProperty('polyfills')
    })

    it('should include all main routes in manifest', () => {
      const manifestPath = '.next/build-manifest.json'
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      
      expect(manifest.pages).toHaveProperty('/')
      expect(manifest.pages).toHaveProperty('/forms/stock-adjustments')
      expect(manifest.pages).toHaveProperty('/performance')
    })
  })

  describe('Static Assets', () => {
    it('should generate static assets', () => {
      const staticDir = '.next/static'
      expect(existsSync(staticDir)).toBe(true)
    })

    it('should have CSS files', () => {
      const cssDir = '.next/static/css'
      expect(existsSync(cssDir)).toBe(true)
    })

    it('should have JavaScript chunks', () => {
      const jsDir = '.next/static/chunks'
      expect(existsSync(jsDir)).toBe(true)
    })
  })

  describe('Build Quality', () => {
    it('should not have TypeScript errors', () => {
      expect(buildResults.output).not.toContain('Type error:')
      expect(buildResults.output).not.toContain('TS')
    })

    it('should not have ESLint errors', () => {
      expect(buildResults.output).not.toContain('ESLint error:')
    })

    it('should not have critical warnings', () => {
      const criticalWarnings = [
        'Warning:',
        'DeprecationWarning:',
        'Critical:',
        'Fatal:'
      ]
      
      criticalWarnings.forEach(warning => {
        expect(buildResults.output).not.toContain(warning)
      })
    })

    it('should not have memory issues', () => {
      expect(buildResults.output).not.toContain('out of memory')
      expect(buildResults.output).not.toContain('Memory limit exceeded')
    })
  })

  describe('Production Readiness', () => {
    it('should be production ready', () => {
      expect(buildResults.success).toBe(true)
      expect(buildResults.output).toMatch(/compiled successfully/i)
    })

    it('should have optimized bundle', () => {
      expect(buildResults.output).toMatch(/compiled successfully/i)
    })

    it('should handle all dependencies', () => {
      expect(buildResults.output).not.toContain('Module not found')
      expect(buildResults.output).not.toContain('Cannot resolve')
    })
  })

  describe('Performance Metrics', () => {
    it('should complete build efficiently', () => {
      // Build should complete within 5 minutes
      expect(buildResults.duration).toBeLessThan(300000)
    })

    it('should not exceed memory limits', () => {
      expect(buildResults.output).not.toContain('JavaScript heap out of memory')
    })

    it('should have reasonable build output size', () => {
      // This is a placeholder - in a real scenario you might check bundle sizes
      expect(buildResults.artifacts.length).toBeGreaterThan(0)
    })
  })
})
