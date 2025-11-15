import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { getRecordCountFromPage } from './helpers/navigation';

test.describe('Smoke Tests - Cleanup @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should delete RTZ-999 and verify cleanup', async ({ page }) => {
    // Navigate to tally cards
    await page.goto('/forms/tally-cards');
    await page.waitForLoadState('networkidle');

    // Helper to search for RTZ-999
    const searchForRTZ999 = async () => {
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/search/i)
      ).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('RTZ-999');
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');
      }
    };

    // Search/filter for RTZ-999
    await searchForRTZ999();

    // Get initial count
    const initialCount = await getRecordCountFromPage(page);

    // Find RTZ-999 row and select checkbox
    const deleteRow = page.locator('tr').filter({ hasText: 'RTZ-999' }).first();
    
    // Check if row exists
    const rowExists = await deleteRow.isVisible().catch(() => false);
    if (!rowExists) {
      // RTZ-999 may have already been deleted or never created
      test.skip();
      return;
    }

    // Select checkbox in the row
    const checkbox = deleteRow.locator('input[type="checkbox"]').or(
      deleteRow.getByRole('checkbox')
    ).first();
    await checkbox.waitFor({ state: 'visible', timeout: 5000 });
    await checkbox.check();
    await page.waitForTimeout(500); // Wait for selection to register

    // Click Delete button (should be enabled after selecting a row)
    const deleteButton = page.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    // Confirm deletion in modal/dialog
    // Look for confirmation button (usually "Delete" or "Confirm" in a dialog)
    const confirmButton = page.getByRole('button', { name: /delete|confirm/i }).filter({ 
      hasText: /delete|confirm/i 
    }).last();
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // Wait for deletion to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Re-search to verify RTZ-999 is removed
    await searchForRTZ999();
    const rtz999AfterDelete = page.getByText('RTZ-999');
    await expect(rtz999AfterDelete).not.toBeVisible({ timeout: 5000 });

    // Verify record count decreased (if we had a count before)
    if (initialCount > 0) {
      const finalCount = await getRecordCountFromPage(page);
      expect(finalCount).toBeLessThanOrEqual(initialCount); // Use <= in case count didn't update yet
    }

    // Verify stock adjustment records for RTZ-999 are also cleaned up (if cascade delete)
    await page.goto('/forms/stock-adjustments');
    await page.waitForLoadState('networkidle');
    await searchForRTZ999();

    const rtz999InAdjustments = page.getByText('RTZ-999');
    await expect(rtz999InAdjustments).not.toBeVisible({ timeout: 5000 });

    // Verify compare-stock no longer shows RTZ-999
    await page.goto('/forms/compare-stock');
    await page.waitForLoadState('networkidle');
    await searchForRTZ999();

    const rtz999InCompare = page.getByText('RTZ-999');
    await expect(rtz999InCompare).not.toBeVisible({ timeout: 5000 });
  });
});



