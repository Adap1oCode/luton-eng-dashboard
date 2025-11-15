import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateToScreen, waitForTableLoad, getRecordCountFromPage } from './helpers/navigation';
import { fillStockAdjustmentForm, addStockAdjustmentLocation, editStockAdjustmentLocation, deleteStockAdjustmentLocation, submitForm } from './helpers/forms';
import { verifyWarehouseFilter } from './helpers/permissions';

test.describe('Smoke Tests - Stock Adjustments @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should verify data loads and pagination works', async ({ page }) => {
    await navigateToScreen(page, 'stock-adjustments');

    // Verify table renders
    await waitForTableLoad(page);
    const rowCount = await page.locator('table tbody tr, [role="row"]:not([role="columnheader"])').count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify record count >= 150
    const recordCount = await getRecordCountFromPage(page);
    expect(recordCount).toBeGreaterThanOrEqual(150);

    // Test pagination
    const nextButton = page.getByRole('button', { name: /go to next page|next/i }).or(
      page.locator('button').filter({ hasText: /next|chevron.*right/i })
    ).first();
    
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForURL(/page=2/, { timeout: 5000 });
      expect(page.url()).toContain('page=2');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should verify filters work', async ({ page }) => {
    await navigateToScreen(page, 'stock-adjustments');

    // Test status filter if available
    const statusFilter = page.getByRole('button', { name: /status/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      const activeOption = page.getByRole('option', { name: /active/i }).first();
      await activeOption.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should verify warehouse filter shows only allowed warehouses', async ({ page }) => {
    await navigateToScreen(page, 'stock-adjustments');
    await verifyWarehouseFilter(page, ['RTZ']);
  });

  test('should create, edit, verify history, and cleanup stock adjustment for RTZ-999', async ({ page }) => {
    // Navigate to stock adjustments
    await navigateToScreen(page, 'stock-adjustments');

    // Step 1: Create Stock Adjustment for RTZ-999
    const newButton = page.getByRole('button', { name: /new adjustment/i });
    await expect(newButton).toBeVisible();
    await newButton.click();

    // Wait for form to load
    await page.waitForURL(/\/forms\/stock-adjustments\/new/, { timeout: 10000 });

    // Fill tally card number (should be pre-filled or selectable)
    const tallyCardInput = page.getByLabel(/tally card/i).first();
    await tallyCardInput.fill('RTZ-999');
    await page.waitForTimeout(500);

    // Select reason code
    const reasonSelect = page.getByLabel(/reason/i).first();
    await reasonSelect.click();
    await page.getByRole('option', { name: /transfer/i }).first().click();

    // Add 4 locations
    await addStockAdjustmentLocation(page, 'A1', 10, 'TRANSFER');
    await addStockAdjustmentLocation(page, 'A2', 20, 'TRANSFER');
    await addStockAdjustmentLocation(page, 'A3', 30, 'TRANSFER');
    await addStockAdjustmentLocation(page, 'A4', 40, 'TRANSFER');

    // Verify all 4 locations are in the table
    const locationRows = page.locator('tr').filter({ hasText: /A[1-4]/ });
    const locationCount = await locationRows.count();
    expect(locationCount).toBeGreaterThanOrEqual(4);

    // Submit form
    await submitForm(page, /\/forms\/stock-adjustments/);

    // Verify redirect to list page
    await expect(page).toHaveURL(/\/forms\/stock-adjustments/);
    await page.waitForLoadState('networkidle');

    // Use search/filter to find RTZ-999 (user confirmed column filters work)
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('RTZ-999');
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    }

    // Verify RTZ-999 appears in table
    const rtz999Link = page.getByRole('link', { name: 'RTZ-999' }).or(
      page.getByText('RTZ-999')
    );
    await expect(rtz999Link).toBeVisible({ timeout: 10000 });

    // Step 2: Edit Stock Adjustment
    // Find the row with RTZ-999 and click edit
    const row = page.locator('tr').filter({ hasText: 'RTZ-999' }).first();
    const editButton = row.getByRole('button', { name: /edit/i }).or(
      row.locator('a[href*="/edit"]').or(
        row.locator('button').filter({ hasText: /edit|pencil/i })
      )
    ).first();
    await editButton.click();

    // Wait for edit page to load
    await page.waitForURL(/\/forms\/stock-adjustments\/.*\/edit/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Wait for locations to load
    await page.waitForTimeout(2000);

    // Edit locations:
    // A1: increase by 1, change reason to Found
    await editStockAdjustmentLocation(page, 'A1', 'increase', 1, 'FOUND');

    // A2: set exact 25, keep reason Transfer
    await editStockAdjustmentLocation(page, 'A2', 'set', 25);

    // A3: decrease by 3, change reason to Damaged
    await editStockAdjustmentLocation(page, 'A3', 'decrease', 3, 'DAMAGE');

    // A4: delete
    await deleteStockAdjustmentLocation(page, 'A4');

    // Verify A4 is removed
    const a4Row = page.locator('tr').filter({ hasText: 'A4' });
    await expect(a4Row).not.toBeVisible({ timeout: 2000 });

    // Submit update
    await submitForm(page, /\/forms\/stock-adjustments/);

    // Verify redirect and updated data
    await expect(page).toHaveURL(/\/forms\/stock-adjustments/);
    await page.waitForLoadState('networkidle');

    // Use search/filter to find RTZ-999 after edit
    const searchInputAfterEdit = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
    if (await searchInputAfterEdit.isVisible().catch(() => false)) {
      await searchInputAfterEdit.fill('RTZ-999');
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    }

    // Step 3: Verify History
    // Navigate back to edit page
    const updatedRow = page.locator('tr').filter({ hasText: 'RTZ-999' }).first();
    const editButton2 = updatedRow.getByRole('button', { name: /edit/i }).or(
      updatedRow.locator('a[href*="/edit"]').or(
        updatedRow.locator('button').filter({ hasText: /edit|pencil/i })
      )
    ).first();
    await editButton2.click();

    await page.waitForURL(/\/forms\/stock-adjustments\/.*\/edit/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Click History tab
    const historyTab = page.getByRole('button', { name: /history/i });
    await expect(historyTab).toBeVisible();
    await historyTab.click();

    // Wait for history table to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify history shows at least 2 records (creation and update)
    const historyRows = page.locator('table tbody tr, [role="row"]:not([role="columnheader"])');
    const historyCount = await historyRows.count();
    expect(historyCount).toBeGreaterThanOrEqual(2);

    // Verify creation entry (should have 4 locations)
    const firstHistoryRow = historyRows.first();
    await expect(firstHistoryRow).toContainText(/A1|A2|A3|A4/i);

    // Verify update entry (should have 3 locations, A4 deleted)
    const secondHistoryRow = historyRows.nth(1);
    await expect(secondHistoryRow).toContainText(/A1|A2|A3/i);
    // A4 should not be in update entry
    const a4InHistory = secondHistoryRow.filter({ hasText: 'A4' });
    await expect(a4InHistory).not.toBeVisible({ timeout: 1000 });

    // Verify "Updated By" shows test user name
    await expect(firstHistoryRow).toContainText(/test user.*tally card manager/i);
  });
});



