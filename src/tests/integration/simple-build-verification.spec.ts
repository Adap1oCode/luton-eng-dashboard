import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

describe('Simple Build Verification', () => {
  let buildSuccess: boolean
  let buildOutput: string

  beforeAll(async () => {
    try {
      console.log('🔨 Starting simple build verification...')
      
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

  describe('Build Success', () => {
    it('should complete build without critical errors', () => {
      // Allow for warnings but not critical errors
      const hasCriticalErrors = buildOutput.includes('Failed to compile') || 
                               buildOutput.includes('Type error:') ||
                               buildOutput.includes('Error:')
      
      expect(hasCriticalErrors).toBe(false)
    })

    it('should generate basic build artifacts', () => {
      const buildDir = '.next'
      expect(existsSync(buildDir)).toBe(true)
    })
  })

  describe('Core Functionality', () => {
    it('should build main application structure', () => {
      const appDir = '.next/server/app'
      expect(existsSync(appDir)).toBe(true)
    })

    it('should build API routes', () => {
      const apiDir = '.next/server/app/api'
      expect(existsSync(apiDir)).toBe(true)
    })
  })

  describe('Stock Adjustments Integration', () => {
    it('should build stock adjustments page', () => {
      const pagePath = '.next/server/app/(main)/forms/stock-adjustments'
      expect(existsSync(pagePath)).toBe(true)
    })

    // Note: API routes use dynamic [resource] route
  })

  describe('Performance Monitoring', () => {
    it('should build performance monitoring page', () => {
      const perfPath = '.next/server/app/(main)/performance'
      expect(existsSync(perfPath)).toBe(true)
    })

    // Note: Components are bundled into chunks, not copied to build output
  })

  describe('Application Integration', () => {
    it('should build forms routes', () => {
      const formsPath = '.next/server/app/(main)/forms'
      expect(existsSync(formsPath)).toBe(true)
    })

    it('should build auth routes', () => {
      const authPath = '.next/server/app/auth'
      expect(existsSync(authPath)).toBe(true)
    })

    // Note: React Query, hooks, lib files are bundled, not in separate folders
  })

  describe('Build Quality', () => {
    it('should not have critical TypeScript errors', () => {
      const hasTypeErrors = buildOutput.includes('Type error:')
      expect(hasTypeErrors).toBe(false)
    })

    it('should not have critical build failures', () => {
      const hasBuildFailures = buildOutput.includes('Failed to compile')
      expect(hasBuildFailures).toBe(false)
    })

    it('should complete build process', () => {
      // Build should complete (even with warnings)
      expect(buildOutput).toMatch(/compiled successfully/i)
    })
  })

  describe('Performance Metrics', () => {
    it('should log build performance', () => {
      console.log(`📊 Build Status: ${buildSuccess ? 'SUCCESS' : 'FAILED'}`)
      console.log(`📊 Build Output Length: ${buildOutput.length} characters`)
      
      if (buildSuccess) {
        console.log('✅ Build completed successfully')
      } else {
        console.log('❌ Build failed - check output for details')
      }
    })
  })
})
