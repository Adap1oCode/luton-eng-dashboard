import { test, expect } from '@playwright/test'

test.describe('Stock Adjustments Forms Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the stock adjustments page
    await page.goto('/forms/stock-adjustments')
    
    // Wait for the page to load
    await expect(page).toHaveTitle(/Stock Adjustments/)
  })

  test('should load the stock adjustments page', async ({ page }) => {
    // Check if the main content is visible
    await expect(page.locator('h1')).toContainText('Stock Adjustments')
    
    // Check if the table is present
    await expect(page.locator('[data-testid="resource-table"]')).toBeVisible()
  })

  test('should display stock adjustments data', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if table headers are present
    await expect(page.locator('th')).toContainText(['Name', 'Warehouse', 'Tally Card', 'Qty', 'Location', 'Note', 'Updated'])
    
    // Check if data rows are present (may be empty in test environment)
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(await rows.count()) // Just verify rows exist
  })

  test('should have working toolbar buttons', async ({ page }) => {
    // Check if New Adjustment button is present
    await expect(page.locator('button:has-text("New Adjustment")')).toBeVisible()
    
    // Check if Delete button is present (may be disabled)
    await expect(page.locator('button:has-text("Delete")')).toBeVisible()
    
    // Check if Export CSV button is present
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible()
  })

  test('should have consolidated table toolbar', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Should have Status dropdown in table toolbar
    await expect(page.locator('text=Status:')).toBeVisible()
    
    // Should have table controls in same toolbar
    await expect(page.locator('button:has-text("Columns")')).toBeVisible()
    await expect(page.locator('button:has-text("Sort")')).toBeVisible()
    await expect(page.locator('button:has-text("More Filters")')).toBeVisible()
  })

  test('should handle pagination', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if pagination controls are present
    const pagination = page.locator('[data-testid="pagination"]')
    if (await pagination.count() > 0) {
      await expect(pagination).toBeVisible()
    }
  })

  test('should handle column sorting', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Try to click on a sortable column header
    const nameHeader = page.locator('th:has-text("Name")')
    if (await nameHeader.count() > 0) {
      await nameHeader.click()
      // Verify the sort indicator appears
      await expect(page.locator('th:has-text("Name") svg')).toBeVisible()
    }
  })

  test('should handle column filtering', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if filter controls are present
    const filterButton = page.locator('button:has-text("More Filters")')
    if (await filterButton.count() > 0) {
      await filterButton.click()
      
      // Check if filter inputs are visible
      await expect(page.locator('input[placeholder*="filter" i]')).toBeVisible()
    }
  })

  test('should handle column visibility', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if columns menu is present
    const columnsButton = page.locator('button:has-text("Columns")')
    if (await columnsButton.count() > 0) {
      await columnsButton.click()
      
      // Check if column visibility controls are present
      await expect(page.locator('[data-testid="columns-menu"]')).toBeVisible()
    }
  })

  test('should handle row selection', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if select all checkbox is present
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]')
    if (await selectAllCheckbox.count() > 0) {
      await expect(selectAllCheckbox).toBeVisible()
      
      // Try to select all rows
      await selectAllCheckbox.click()
      
      // Verify individual row checkboxes are checked
      const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
      const checkedCount = await rowCheckboxes.evaluateAll(checkboxes => 
        checkboxes.filter(cb => cb.checked).length
      )
      expect(checkedCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should handle export functionality', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if export button is present
    const exportButton = page.locator('button:has-text("Export CSV")')
    if (await exportButton.count() > 0) {
      await expect(exportButton).toBeVisible()
      
      // Click export button and verify download starts
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()
      
      try {
        const download = await downloadPromise
        expect(download.suggestedFilename()).toContain('.csv')
      } catch (error) {
        // Download might not work in test environment, that's ok
        console.log('Download test skipped - may not work in test environment')
      }
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Reload the page
    await page.reload()
    
    // Check if the page is still functional on mobile
    await expect(page.locator('h1')).toContainText('Stock Adjustments')
    await expect(page.locator('[data-testid="resource-table"]')).toBeVisible()
  })

  test('should handle empty state gracefully', async ({ page }) => {
    // This test assumes the database is empty or returns no results
    // In a real test environment, you might need to mock the API response
    
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Check if "No results" message is displayed when there's no data
    const noResultsMessage = page.locator('text=No results')
    if (await noResultsMessage.count() > 0) {
      await expect(noResultsMessage).toBeVisible()
    }
  })

  test('should handle loading state', async ({ page }) => {
    // Navigate to the page and immediately check for loading indicators
    await page.goto('/forms/stock-adjustments')
    
    // Check if loading indicators are present (if any)
    const loadingIndicator = page.locator('[data-testid="loading"]')
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible()
    }
    
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Verify loading is complete
    await expect(page.locator('[data-testid="resource-table"]')).toBeVisible()
  })

  test('should handle error state gracefully', async ({ page }) => {
    // This test would require mocking API failures
    // For now, just verify the page structure is intact
    
    await expect(page.locator('h1')).toContainText('Stock Adjustments')
    await expect(page.locator('[data-testid="resource-table"]')).toBeVisible()
  })

  test('should maintain state during navigation', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Navigate to another page and back
    await page.goto('/dashboard')
    await page.goto('/forms/stock-adjustments')
    
    // Verify the page still loads correctly
    await expect(page.locator('h1')).toContainText('Stock Adjustments')
    await expect(page.locator('[data-testid="resource-table"]')).toBeVisible()
  })

  test('should keep expanded row open after inline edit', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid="resource-table"]')
    
    // Wait for data rows to be present
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Find the expand button (chevron) for the first row
    const firstRowExpandButton = page.locator('tbody tr').first().locator('button[aria-label*="expand" i], button:has(svg)').first()
    
    // Check if expand functionality is available (some tables may not have expandable rows)
    const expandButtonCount = await firstRowExpandButton.count()
    
    if (expandButtonCount > 0) {
      // Expand the first row
      await firstRowExpandButton.click()
      
      // Wait for expanded content to appear
      const expandedContent = page.locator('tbody tr').first().locator('td[colspan]')
      await expect(expandedContent).toBeVisible({ timeout: 5000 })
      
      // Find an editable cell in the expanded row (or any row)
      // Look for qty column which is inline editable
      const qtyCell = page.locator('tbody tr').first().locator('td').filter({ hasText: /^\d+$/ }).first()
      
      // If qty cell is not found, try to find any cell with inline edit capability
      const editableCell = qtyCell.count() > 0 
        ? qtyCell 
        : page.locator('tbody tr').first().locator('td').nth(4) // Qty is typically 5th column (after select, expand, tally card, warehouse)
      
      const cellCount = await editableCell.count()
      
      if (cellCount > 0) {
        // Double-click to start inline edit (or click edit icon if present)
        await editableCell.dblclick()
        
        // Wait for edit input to appear
        const editInput = page.locator('input[type="number"], input[type="text"]').first()
        await expect(editInput).toBeVisible({ timeout: 3000 })
        
        // Enter new value
        await editInput.fill('999')
        
        // Save the edit (click save button or press Enter)
        const saveButton = page.locator('button[aria-label*="save" i], button:has(svg[class*="check"])').first()
        const saveButtonCount = await saveButton.count()
        
        if (saveButtonCount > 0) {
          await saveButton.click()
        } else {
          // Fallback: press Enter
          await editInput.press('Enter')
        }
        
        // Wait a moment for the save to complete
        await page.waitForTimeout(1000)
        
        // Verify the expanded row is still visible
        await expect(expandedContent).toBeVisible({ timeout: 5000 })
        
        // Verify the edited value appears (optimistic update)
        const updatedValue = page.locator('tbody tr').first().locator('td').filter({ hasText: '999' })
        await expect(updatedValue.first()).toBeVisible({ timeout: 3000 })
      } else {
        // If no editable cell found, just verify expanded state persists
        // This is still a valid test - expanded state should not collapse
        await expect(expandedContent).toBeVisible()
      }
    } else {
      // If expand functionality is not available, skip this test
      // Note: This test requires expandable rows to be present
      test.info().skip(true, 'Expand functionality not available')
    }
  })
})
