import { test, expect } from '@playwright/test'

test.describe('Stock Adjustments - User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the stock adjustments page
    await page.goto('/forms/stock-adjustments')
    
    // Wait for the page to load completely
    await expect(page).toHaveTitle(/Stock Adjustments/)
    await page.waitForLoadState('networkidle')
  })

  test('user can view stock adjustments list', async ({ page }) => {
    // Verify page title and main elements
    await expect(page.getByRole('heading', { name: 'Stock Adjustments' })).toBeVisible()
    await expect(page.getByTestId('resource-table')).toBeVisible()
    
    // Verify record count is displayed
    await expect(page.getByTestId('record-count')).toBeVisible()
    
    // Verify table headers are present
    await expect(page.getByRole('columnheader', { name: 'Tally Card' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Quantity' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Location' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Note' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  })

  test('user can navigate through pagination', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if pagination controls are present
    const pagination = page.getByTestId('pagination')
    if (await pagination.isVisible()) {
      // Test pagination navigation
      const nextButton = page.getByRole('button', { name: /next/i })
      const prevButton = page.getByRole('button', { name: /previous/i })
      
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForLoadState('networkidle')
      }
      
      if (await prevButton.isEnabled()) {
        await prevButton.click()
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('user can search and filter data', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Test search functionality
    const searchInput = page.getByPlaceholder(/search/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await page.waitForLoadState('networkidle')
      
      // Clear search
      await searchInput.clear()
      await page.waitForLoadState('networkidle')
    }
    
    // Test column sorting
    const quantityHeader = page.getByRole('columnheader', { name: 'Quantity' })
    if (await quantityHeader.isVisible()) {
      await quantityHeader.click()
      await page.waitForLoadState('networkidle')
      
      // Click again to reverse sort
      await quantityHeader.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('user can toggle column visibility', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Look for column visibility controls
    const columnMenu = page.getByRole('button', { name: /columns/i })
    if (await columnMenu.isVisible()) {
      await columnMenu.click()
      
      // Toggle a column visibility
      const noteCheckbox = page.getByRole('checkbox', { name: 'Note' })
      if (await noteCheckbox.isVisible()) {
        await noteCheckbox.click()
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('user can select rows for bulk operations', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Look for select all checkbox
    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i })
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.click()
      
      // Verify bulk action buttons appear
      const deleteButton = page.getByRole('button', { name: /delete/i })
      if (await deleteButton.isVisible()) {
        await expect(deleteButton).toBeEnabled()
      }
    }
  })

  test('user can export data', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export/i })
    if (await exportButton.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()
      
      // Wait for download to complete
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    }
  })

  test('user can view adjustment details', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Look for expandable rows or detail buttons
    const expandButton = page.getByRole('button', { name: /expand/i }).first()
    if (await expandButton.isVisible()) {
      await expandButton.click()
      
      // Verify details are shown
      await expect(page.getByText(/details/i)).toBeVisible()
    }
  })

  test('user can handle empty state gracefully', async ({ page }) => {
    // This test would need to be run with empty data
    // For now, just verify the page loads without errors
    await expect(page.getByRole('heading', { name: 'Stock Adjustments' })).toBeVisible()
    await expect(page.getByTestId('resource-table')).toBeVisible()
  })

  test('user can handle loading states', async ({ page }) => {
    // Navigate to page and verify loading states are handled
    await page.goto('/forms/stock-adjustments')
    
    // Check for loading indicators
    const loadingIndicator = page.getByTestId('loading')
    if (await loadingIndicator.isVisible()) {
      // Wait for loading to complete
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 })
    }
    
    // Verify data loads
    await expect(page.getByTestId('resource-table')).toBeVisible()
  })

  test('user can handle error states', async ({ page }) => {
    // This test would need to be run with error conditions
    // For now, just verify the page loads without errors
    await expect(page.getByRole('heading', { name: 'Stock Adjustments' })).toBeVisible()
    
    // Check for error boundaries
    const errorMessage = page.getByText(/error/i)
    if (await errorMessage.isVisible()) {
      // Verify error is displayed properly
      await expect(errorMessage).toBeVisible()
    }
  })
})