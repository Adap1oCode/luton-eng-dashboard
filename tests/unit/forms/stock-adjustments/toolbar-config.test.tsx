import { describe, it, expect } from 'vitest'
import { 
  stockAdjustmentsToolbar, 
  stockAdjustmentsActions, 
  stockAdjustmentsChips,
  stockAdjustmentsActionMenu 
} from '@/app/(main)/forms/stock-adjustments/toolbar.config'

describe('Stock Adjustments Toolbar Config', () => {
  describe('Toolbar Configuration', () => {
    it('should have correct toolbar structure', () => {
      expect(stockAdjustmentsToolbar).toHaveProperty('left')
      expect(stockAdjustmentsToolbar).toHaveProperty('right')
      expect(Array.isArray(stockAdjustmentsToolbar.left)).toBe(true)
      expect(Array.isArray(stockAdjustmentsToolbar.right)).toBe(true)
    })

    it('should have correct left toolbar buttons', () => {
      const leftButtons = stockAdjustmentsToolbar.left
      expect(leftButtons).toHaveLength(2)

      // New button
      const newButton = leftButtons.find(btn => btn.id === 'new')
      expect(newButton).toBeDefined()
      expect(newButton?.label).toBe('New Adjustment')
      expect(newButton?.icon).toBe('Plus')
      expect(newButton?.variant).toBe('default')
      expect(newButton?.href).toBe('/forms/stock-adjustments/new')
      expect(newButton?.requiredAny).toEqual(['resource:tcm_user_tally_card_entries:create'])

      // Delete button
      const deleteButton = leftButtons.find(btn => btn.id === 'delete')
      expect(deleteButton).toBeDefined()
      expect(deleteButton?.label).toBe('Delete')
      expect(deleteButton?.icon).toBe('Trash2')
      expect(deleteButton?.variant).toBe('destructive')
      expect(deleteButton?.action).toBe('deleteSelected')
      expect(deleteButton?.enableWhen).toBe('anySelected')
      expect(deleteButton?.requiredAny).toEqual(['resource:tcm_user_tally_card_entries:delete'])
    })

    it('should have empty right toolbar', () => {
      expect(stockAdjustmentsToolbar.right).toHaveLength(0)
    })
  })

  describe('Actions Configuration', () => {
    it('should have correct actions structure', () => {
      expect(stockAdjustmentsActions).toHaveProperty('deleteSelected')
      expect(stockAdjustmentsActions).toHaveProperty('exportCsv')
    })

    it('should have correct deleteSelected action', () => {
      const deleteAction = stockAdjustmentsActions.deleteSelected
      expect(deleteAction.method).toBe('DELETE')
      expect(deleteAction.endpoint).toBe('/api/tcm_user_tally_card_entries/bulk-delete')
    })

    it('should have correct exportCsv action', () => {
      const exportAction = stockAdjustmentsActions.exportCsv
      expect(exportAction.method).toBe('GET')
      expect(exportAction.endpoint).toBe('/api/tcm_user_tally_card_entries/export')
      expect(exportAction.target).toBe('_blank')
    })
  })

  describe('Chips Configuration', () => {
    it('should have undefined chips config', () => {
      expect(stockAdjustmentsChips).toBeUndefined()
    })
  })

  describe('Action Menu', () => {
    it('should have correct action menu items', () => {
      expect(Array.isArray(stockAdjustmentsActionMenu)).toBe(true)
      expect(stockAdjustmentsActionMenu).toHaveLength(4)

      const menuIds = stockAdjustmentsActionMenu.map(item => item.id)
      expect(menuIds).toContain('edit')
      expect(menuIds).toContain('copy')
      expect(menuIds).toContain('favorite')
      expect(menuIds).toContain('delete')

      // Check edit action
      const editAction = stockAdjustmentsActionMenu.find(item => item.id === 'edit')
      expect(editAction?.label).toBe('Edit')

      // Check copy action
      const copyAction = stockAdjustmentsActionMenu.find(item => item.id === 'copy')
      expect(copyAction?.label).toBe('Copy')

      // Check favorite action
      const favoriteAction = stockAdjustmentsActionMenu.find(item => item.id === 'favorite')
      expect(favoriteAction?.label).toBe('Favorite')

      // Check delete action
      const deleteAction = stockAdjustmentsActionMenu.find(item => item.id === 'delete')
      expect(deleteAction?.label).toBe('Delete')
    })
  })

  describe('API Endpoints', () => {
    it('should use correct base API endpoint', () => {
      // The BASE_API constant should be '/api/tcm_user_tally_card_entries'
      // This is used in the actions configuration
      expect(stockAdjustmentsActions.deleteSelected.endpoint).toContain('/api/tcm_user_tally_card_entries')
      expect(stockAdjustmentsActions.exportCsv.endpoint).toContain('/api/tcm_user_tally_card_entries')
    })
  })

  describe('Permission Requirements', () => {
    it('should have correct permission requirements for new button', () => {
      const newButton = stockAdjustmentsToolbar.left.find(btn => btn.id === 'new')
      expect(newButton?.requiredAny).toEqual(['resource:tcm_user_tally_card_entries:create'])
    })

    it('should have correct permission requirements for delete button', () => {
      const deleteButton = stockAdjustmentsToolbar.left.find(btn => btn.id === 'delete')
      expect(deleteButton?.requiredAny).toEqual(['resource:tcm_user_tally_card_entries:delete'])
    })
  })
})
