import { describe, it, expect } from 'vitest'
import { generateResourcePage, generatePageContent, generateConfigContent } from '@/lib/generators/resource-page-generator'

describe('Resource Page Generator', () => {
  const mockConfig = {
    resource: 'users',
    title: 'User Management',
    fields: [
      { key: 'id', label: 'ID', type: 'text' as const, sortable: true, filterable: true },
      { key: 'name', label: 'Name', type: 'text' as const, sortable: true, filterable: true },
      { key: 'email', label: 'Email', type: 'text' as const, sortable: true, filterable: true },
      { key: 'role', label: 'Role', type: 'select' as const, sortable: true, filterable: true },
      { key: 'created_at', label: 'Created At', type: 'date' as const, sortable: true, filterable: true },
      { key: 'active', label: 'Active', type: 'boolean' as const, sortable: true, filterable: true },
    ],
    features: {
      rowSelection: true,
      pagination: true,
      sorting: true,
      filtering: true,
      inlineEditing: false,
    }
  }

  describe('generateResourcePage', () => {
    it('should generate complete resource page configuration', () => {
      const result = generateResourcePage(mockConfig)

      expect(result).toHaveProperty('title', 'User Management')
      expect(result).toHaveProperty('viewConfig')
      expect(result).toHaveProperty('toolbarConfig')
      expect(result).toHaveProperty('actionsConfig')
      expect(result).toHaveProperty('chipsConfig')
      expect(result).toHaveProperty('config')
    })

    it('should generate view config with correct properties', () => {
      const result = generateResourcePage(mockConfig)
      const viewConfig = result.viewConfig

      expect(viewConfig).toHaveProperty('resourceKeyForDelete', 'users')
      expect(viewConfig).toHaveProperty('formsRouteSegment', 'users')
      expect(viewConfig).toHaveProperty('idField', 'id')
      expect(viewConfig).toHaveProperty('features')
      expect(viewConfig).toHaveProperty('buildColumns')
    })

    it('should generate toolbar config with default buttons', () => {
      const result = generateResourcePage(mockConfig)
      const toolbarConfig = result.toolbarConfig

      expect(toolbarConfig.left).toHaveLength(2)
      expect(toolbarConfig.left[0]).toHaveProperty('id', 'new')
      expect(toolbarConfig.left[0]).toHaveProperty('label', 'New User Management')
      expect(toolbarConfig.left[1]).toHaveProperty('id', 'delete')
      expect(toolbarConfig.left[1]).toHaveProperty('label', 'Delete')
    })

    it('should generate actions config with default actions', () => {
      const result = generateResourcePage(mockConfig)
      const actionsConfig = result.actionsConfig

      expect(actionsConfig).toHaveProperty('deleteSelected')
      expect(actionsConfig).toHaveProperty('exportCsv')
      expect(actionsConfig.deleteSelected).toHaveProperty('method', 'DELETE')
      expect(actionsConfig.deleteSelected).toHaveProperty('endpoint', '/api/users/bulk-delete')
    })

    it('should generate chips config for filterable fields', () => {
      const result = generateResourcePage(mockConfig)
      const chipsConfig = result.chipsConfig

      expect(chipsConfig).toHaveLength(6) // All fields are filterable
      expect(chipsConfig[0]).toHaveProperty('id', 'id')
      expect(chipsConfig[0]).toHaveProperty('label', 'ID')
      expect(chipsConfig[0]).toHaveProperty('type', 'text')
    })
  })

  describe('generatePageContent', () => {
    it('should generate valid page.tsx content', () => {
      const content = generatePageContent(mockConfig)

      expect(content).toContain('// Auto-generated page for User Management')
      expect(content).toContain('import type { Metadata } from "next"')
      expect(content).toContain('export const metadata: Metadata = {')
      expect(content).toContain('title: "User Management"')
      expect(content).toContain('export default async function Page')
      expect(content).toContain('endpoint: "/api/users"')
    })

    it('should include all field mappings in toRow function', () => {
      const content = generatePageContent(mockConfig)

      expect(content).toContain('id: d?.id ?? null')
      expect(content).toContain('name: d?.name ?? null')
      expect(content).toContain('email: d?.email ?? null')
      expect(content).toContain('role: d?.role ?? null')
      expect(content).toContain('created_at: d?.created_at ?? null')
      expect(content).toContain('active: d?.active ?? null')
    })
  })

  describe('generateConfigContent', () => {
    it('should generate valid config.tsx content', () => {
      const content = generateConfigContent(mockConfig)

      expect(content).toContain('// Auto-generated configuration for User Management')
      expect(content).toContain('export const usersViewConfig')
      expect(content).toContain('export const usersToolbar')
      expect(content).toContain('export const usersActions')
      expect(content).toContain('export const usersChips')
    })

    it('should include all field definitions in chips config', () => {
      const content = generateConfigContent(mockConfig)

      expect(content).toContain('"id": "id"')
      expect(content).toContain('"label": "ID"')
      expect(content).toContain('"id": "name"')
      expect(content).toContain('"label": "Name"')
      expect(content).toContain('"id": "email"')
      expect(content).toContain('"label": "Email"')
    })
  })

  describe('field type inference', () => {
    it('should handle different field types correctly', () => {
      const configWithTypes = {
        ...mockConfig,
        fields: [
          { key: 'id', label: 'ID', type: 'text' as const },
          { key: 'price', label: 'Price', type: 'number' as const },
          { key: 'created_at', label: 'Created At', type: 'date' as const },
          { key: 'active', label: 'Active', type: 'boolean' as const },
          { key: 'status', label: 'Status', type: 'status' as const },
        ]
      }

      const result = generateResourcePage(configWithTypes)
      const chipsConfig = result.chipsConfig

      expect(chipsConfig[0]).toHaveProperty('type', 'text')
      expect(chipsConfig[1]).toHaveProperty('type', 'number')
      expect(chipsConfig[2]).toHaveProperty('type', 'date')
      expect(chipsConfig[3]).toHaveProperty('type', 'boolean')
      expect(chipsConfig[4]).toHaveProperty('type', 'status')
    })
  })

  describe('custom configurations', () => {
    it('should handle custom toolbar configuration', () => {
      const customConfig = {
        ...mockConfig,
        toolbar: {
          left: [
            { id: 'custom', label: 'Custom Action', icon: 'Star', variant: 'outline' as const }
          ]
        }
      }

      const result = generateResourcePage(customConfig)
      const toolbarConfig = result.toolbarConfig

      expect(toolbarConfig.left).toHaveLength(3) // 2 default + 1 custom
      expect(toolbarConfig.left[2]).toHaveProperty('id', 'custom')
      expect(toolbarConfig.left[2]).toHaveProperty('label', 'Custom Action')
    })

    it('should handle custom features configuration', () => {
      const customConfig = {
        ...mockConfig,
        features: {
          rowSelection: false,
          pagination: true,
          sorting: false,
          filtering: true,
          inlineEditing: true,
        }
      }

      const result = generateResourcePage(customConfig)
      const viewConfig = result.viewConfig

      expect(viewConfig.features).toEqual({
        rowSelection: false,
        pagination: true,
        sortable: false,
      })
    })
  })
})
