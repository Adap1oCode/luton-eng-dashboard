import { describe, it, expect } from 'vitest'

describe('useStockAdjustments Hook - Simple Tests', () => {
  it('should export the hook function', async () => {
    const { useStockAdjustments } = await import('@/hooks/use-stock-adjustments')
    expect(typeof useStockAdjustments).toBe('function')
  })

  it('should export mutation hooks', async () => {
    const { useDeleteStockAdjustments, useCreateStockAdjustment, useUpdateStockAdjustment } = await import('@/hooks/use-stock-adjustments')
    
    expect(typeof useDeleteStockAdjustments).toBe('function')
    expect(typeof useCreateStockAdjustment).toBe('function')
    expect(typeof useUpdateStockAdjustment).toBe('function')
  })

  it('should have correct module structure', async () => {
    const module = await import('@/hooks/use-stock-adjustments')
    
    // Check that the module has the expected exports
    expect(Object.keys(module)).toContain('useStockAdjustments')
    expect(Object.keys(module)).toContain('useDeleteStockAdjustments')
    expect(Object.keys(module)).toContain('useCreateStockAdjustment')
    expect(Object.keys(module)).toContain('useUpdateStockAdjustment')
  })
})
