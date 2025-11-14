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

    // Search/filter for RTZ-999
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i)
    ).first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('RTZ-999');
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    }

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

    const checkbox = deleteRow.locator('input[type="checkbox"]').or(
      deleteRow.getByRole('checkbox')
    ).first();
    await checkbox.check();

    // Click Delete button
    const deleteButton = page.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Confirm deletion in modal
    const confirmButton = page.getByRole('button', { name: /delete|confirm/i }).filter({ 
      hasText: /delete|confirm/i 
    }).last();
    await confirmButton.click();

    // Wait for deletion to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify RTZ-999 is removed
    const rtz999AfterDelete = page.getByText('RTZ-999');
    await expect(rtz999AfterDelete).not.toBeVisible({ timeout: 5000 });

    // Verify record count decreased
    const finalCount = await getRecordCountFromPage(page);
    expect(finalCount).toBeLessThan(initialCount);

    // Verify stock adjustment records for RTZ-999 are also cleaned up (if cascade delete)
    await page.goto('/forms/stock-adjustments');
    await page.waitForLoadState('networkidle');

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('RTZ-999');
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    }

    const rtz999InAdjustments = page.getByText('RTZ-999');
    await expect(rtz999InAdjustments).not.toBeVisible({ timeout: 5000 });

    // Verify compare-stock no longer shows RTZ-999
    await page.goto('/forms/compare-stock');
    await page.waitForLoadState('networkidle');

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('RTZ-999');
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    }

    const rtz999InCompare = page.getByText('RTZ-999');
    await expect(rtz999InCompare).not.toBeVisible({ timeout: 5000 });
  });
});


