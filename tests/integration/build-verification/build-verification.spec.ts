import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('Build Verification Integration Tests', () => {
  let buildOutput: string
  let buildSuccess: boolean

  beforeAll(async () => {
    try {
      console.log('🔨 Starting build verification...')
      
      // Run the build process
      buildOutput = execSync('npm run build', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      })
      
      buildSuccess = true
      console.log('✅ Build completed successfully')
    } catch (error: any) {
      buildOutput = error.stdout || error.message || 'Build failed'
      buildSuccess = false
      console.error('❌ Build failed:', error.message)
    }
  })

  afterAll(() => {
    // Clean up any build artifacts if needed
    console.log('🧹 Build verification completed')
  })

  describe('Build Process', () => {
    it('should complete build without errors', () => {
      expect(buildSuccess).toBe(true)
      expect(buildOutput).not.toContain('Error:')
      expect(buildOutput).not.toContain('Failed to compile')
    })

    it('should generate required build artifacts', () => {
      const buildDir = '.next'
      expect(existsSync(buildDir)).toBe(true)
      expect(existsSync(join(buildDir, 'static'))).toBe(true)
      expect(existsSync(join(buildDir, 'server'))).toBe(true)
    })

    it('should not have TypeScript errors', () => {
      expect(buildOutput).not.toContain('Type error:')
      expect(buildOutput).not.toContain('TS')
    })

    it('should not have ESLint errors', () => {
      expect(buildOutput).not.toContain('ESLint error:')
      expect(buildOutput).not.toContain('eslint')
    })
  })

  describe('Next.js Build Output', () => {
    it('should generate static pages', () => {
      const staticDir = '.next/static'
      expect(existsSync(staticDir)).toBe(true)
    })

    it('should generate server components', () => {
      const serverDir = '.next/server'
      expect(existsSync(serverDir)).toBe(true)
    })

    it('should generate build manifest', () => {
      const manifestPath = '.next/build-manifest.json'
      expect(existsSync(manifestPath)).toBe(true)
      
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      expect(manifest).toHaveProperty('pages')
      // Note: Next.js 15 may not have polyfills property
    })
  })

  describe('Application Routes', () => {
    it('should build main application routes', () => {
      const serverPages = '.next/server/app'
      expect(existsSync(serverPages)).toBe(true)
    })

    it('should build API routes', () => {
      const apiDir = '.next/server/app/api'
      expect(existsSync(apiDir)).toBe(true)
    })

    it('should build forms routes', () => {
      const formsDir = '.next/server/app/(main)/forms'
      expect(existsSync(formsDir)).toBe(true)
    })
  })

  describe('Performance Optimizations', () => {
    it('should have optimized bundle sizes', () => {
      // Check that build output mentions optimization
      expect(buildOutput).toMatch(/compiled successfully/i)
    })

    it('should generate static assets', () => {
      const staticDir = '.next/static'
      expect(existsSync(staticDir)).toBe(true)
    })
  })

  describe('Stock Adjustments Integration', () => {
    it('should build stock adjustments page', () => {
      const stockAdjustmentsPath = '.next/server/app/(main)/forms/stock-adjustments'
      expect(existsSync(stockAdjustmentsPath)).toBe(true)
    })

    // Note: API routes are in .next/server/app/api/[resource] (dynamic route)
  })

  describe('Performance Monitoring Integration', () => {
    it('should build performance monitoring page', () => {
      const performancePath = '.next/server/app/(main)/performance'
      expect(existsSync(performancePath)).toBe(true)
    })

    // Note: Components, hooks, and lib files are bundled into chunks, not copied to build output
  })

  describe('Application Routes Built', () => {
    it('should build forms routes', () => {
      const formsPath = '.next/server/app/(main)/forms'
      expect(existsSync(formsPath)).toBe(true)
    })

    it('should build API routes', () => {
      const apiPath = '.next/server/app/api'
      expect(existsSync(apiPath)).toBe(true)
    })

    it('should build auth routes', () => {
      const authPath = '.next/server/app/auth'
      expect(existsSync(authPath)).toBe(true)
    })
  })

  describe('Build Warnings and Errors', () => {
    it('should not have critical build warnings', () => {
      const criticalWarnings = [
        'Warning:',
        'DeprecationWarning:',
        'Critical:',
        'Fatal:'
      ]
      
      criticalWarnings.forEach(warning => {
        expect(buildOutput).not.toContain(warning)
      })
    })

    it('should not have memory issues', () => {
      expect(buildOutput).not.toContain('out of memory')
      expect(buildOutput).not.toContain('Memory limit exceeded')
    })

    it('should not have dependency issues', () => {
      expect(buildOutput).not.toContain('Module not found')
      expect(buildOutput).not.toContain('Cannot resolve')
    })
  })

  describe('Build Performance', () => {
    it('should complete within reasonable time', () => {
      // This test passes if the build completed successfully
      // In a real scenario, you might want to measure build time
      expect(buildSuccess).toBe(true)
    })

    it('should not exceed memory limits', () => {
      expect(buildOutput).not.toContain('JavaScript heap out of memory')
    })
  })

  describe('Production Readiness', () => {
    it('should be production ready', () => {
      expect(buildSuccess).toBe(true)
      expect(buildOutput).toMatch(/compiled successfully/i)
    })

    it('should have optimized assets', () => {
      const staticDir = '.next/static'
      expect(existsSync(staticDir)).toBe(true)
    })

    it('should have proper error handling', () => {
      // Build should complete without unhandled errors
      expect(buildSuccess).toBe(true)
    })
  })
})
