import { describe, it, expect } from 'vitest'
import { 
  tallyCardsToolbar, 
  tallyCardsActions, 
  tallyCardsChips
} from '@/app/(main)/forms/tally-cards/tally-cards.config'

describe('Tally Cards Toolbar Config', () => {
  describe('Toolbar Configuration', () => {
    it('should have correct toolbar structure', () => {
      expect(tallyCardsToolbar).toHaveProperty('left')
      expect(tallyCardsToolbar).toHaveProperty('right')
      expect(Array.isArray(tallyCardsToolbar.left)).toBe(true)
      expect(Array.isArray(tallyCardsToolbar.right)).toBe(true)
    })

    it('should have correct left toolbar buttons', () => {
      const leftButtons = tallyCardsToolbar.left
      expect(leftButtons).toHaveLength(3)

      // New button
      const newButton = leftButtons.find(btn => btn.id === 'new')
      expect(newButton).toBeDefined()
      expect(newButton?.label).toBe('New Tally Card')
      expect(newButton?.icon).toBe('Plus')
      expect(newButton?.variant).toBe('default')
      expect(newButton?.href).toBe('/forms/tally-cards/new')
      expect(newButton?.requiredAny).toEqual(['screen:tally-cards:create'])

      // Delete button
      const deleteButton = leftButtons.find(btn => btn.id === 'delete')
      expect(deleteButton).toBeDefined()
      expect(deleteButton?.label).toBe('Delete')
      expect(deleteButton?.icon).toBe('Trash2')
      expect(deleteButton?.variant).toBe('destructive')
      expect(deleteButton?.action).toBe('deleteSelected')
      expect(deleteButton?.enableWhen).toBe('anySelected')
      expect(deleteButton?.requiredAny).toEqual(['screen:tally-cards:delete'])

      // Export CSV button
      const exportButton = leftButtons.find(btn => btn.id === 'exportCsv')
      expect(exportButton).toBeDefined()
      expect(exportButton?.label).toBe('Export CSV')
      expect(exportButton?.icon).toBe('Download')
      expect(exportButton?.variant).toBe('outline')
      expect(exportButton?.onClickId).toBe('exportCsv')
    })

    it('should have empty right toolbar', () => {
      expect(tallyCardsToolbar.right).toHaveLength(0)
    })
  })

  describe('Actions Configuration', () => {
    it('should have correct actions structure', () => {
      expect(tallyCardsActions).toHaveProperty('deleteSelected')
      expect(tallyCardsActions).toHaveProperty('exportCsv')
    })

    it('should have correct deleteSelected action', () => {
      const deleteAction = tallyCardsActions.deleteSelected
      expect(deleteAction.method).toBe('DELETE')
      expect(deleteAction.endpoint).toBe('/api/v_tcm_tally_cards_current/bulk-delete')
    })

    it('should have correct exportCsv action', () => {
      const exportAction = tallyCardsActions.exportCsv
      expect(exportAction.method).toBe('GET')
      expect(exportAction.endpoint).toBe('/api/v_tcm_tally_cards_current/export')
      expect(exportAction.target).toBe('_blank')
    })
  })

  describe('Chips Configuration', () => {
    it('should have undefined chips config', () => {
      expect(tallyCardsChips).toBeUndefined()
    })
  })

  describe('API Endpoints', () => {
    it('should use correct base API endpoint', () => {
      // The API_ENDPOINT constant should be '/api/v_tcm_tally_cards_current'
      // This is used in the actions configuration
      expect(tallyCardsActions.deleteSelected.endpoint).toContain('/api/v_tcm_tally_cards_current')
      expect(tallyCardsActions.exportCsv.endpoint).toContain('/api/v_tcm_tally_cards_current')
    })
  })

  describe('Permission Requirements', () => {
    it('should have correct permission requirements for new button', () => {
      const newButton = tallyCardsToolbar.left.find(btn => btn.id === 'new')
      expect(newButton?.requiredAny).toEqual(['screen:tally-cards:create'])
    })

    it('should have correct permission requirements for delete button', () => {
      const deleteButton = tallyCardsToolbar.left.find(btn => btn.id === 'delete')
      expect(deleteButton?.requiredAny).toEqual(['screen:tally-cards:delete'])
    })
  })
})
