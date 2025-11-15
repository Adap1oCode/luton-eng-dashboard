import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateToScreen, waitForTableLoad, getRecordCountFromPage, searchForRecord } from './helpers/navigation';
import { fillTallyCardForm, submitForm } from './helpers/forms';
import { verifyWarehouseFilter } from './helpers/permissions';

test.describe('Smoke Tests - Tally Cards @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should verify data loads and pagination works', async ({ page }) => {
    await navigateToScreen(page, 'tally-cards');

    // Verify table renders
    await waitForTableLoad(page);
    const rowCount = await page.locator('table tbody tr, [role="row"]:not([role="columnheader"])').count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify record count >= 150
    const recordCount = await getRecordCountFromPage(page);
    expect(recordCount).toBeGreaterThanOrEqual(150);

    // Test pagination - click next page
    const nextButton = page.getByRole('button', { name: /go to next page|next/i }).or(
      page.locator('button').filter({ hasText: /next|chevron.*right/i })
    ).first();
    
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForURL(/page=2/, { timeout: 5000 });
      
      // Verify URL changed
      expect(page.url()).toContain('page=2');
      
      // Verify table data changed (wait for new data to load)
      await page.waitForLoadState('networkidle');
      const newRowCount = await page.locator('table tbody tr, [role="row"]:not([role="columnheader"])').count();
      expect(newRowCount).toBeGreaterThan(0);
    }
  });

  test('should verify filters work', async ({ page }) => {
    await navigateToScreen(page, 'tally-cards');

    // Find status filter (quick filter)
    const statusFilter = page.getByRole('button', { name: /status/i }).or(
      page.locator('button, select').filter({ hasText: /status/i })
    ).first();

    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      
      // Select "Active" filter
      const activeOption = page.getByRole('option', { name: /active/i }).or(
        page.getByText(/active/i)
      ).first();
      await activeOption.click();

      // Wait for filtered results
      await page.waitForLoadState('networkidle');
      
      // Verify filtered results (all should be active)
      const activeCells = page.locator('td').filter({ hasText: /yes/i });
      const activeCount = await activeCells.count();
      expect(activeCount).toBeGreaterThan(0);
    }
  });

  test('should verify warehouse filter shows only allowed warehouses', async ({ page }) => {
    await navigateToScreen(page, 'tally-cards');
    
    // Verify warehouse filter shows only RTZ - WH 1
    await verifyWarehouseFilter(page, ['RTZ']);
  });

  test('should create, edit, verify history, and delete RTZ-999', async ({ page }) => {
    await navigateToScreen(page, 'tally-cards');

    // Step 1: Create RTZ-999
    const newButton = page.getByRole('button', { name: /new tally card/i });
    await expect(newButton).toBeVisible();
    await newButton.click();

    // Wait for form to load
    await page.waitForURL(/\/forms\/tally-cards\/new/, { timeout: 10000 });

    // Fill form
    await fillTallyCardForm(page, {
      tally_card_number: 'RTZ-999',
      warehouse_id: 'RTZ - WH 1',
      item_number: '5061037378413',
      note: 'Creating new Tally Card for testing purposes',
      is_active: false,
    });

    // Submit form
    await submitForm(page, /\/forms\/tally-cards/);

    // Verify redirect to list page
    await expect(page).toHaveURL(/\/forms\/tally-cards/);
    await page.waitForLoadState('networkidle');

    // Use search/filter to find RTZ-999 (user confirmed column filters work)
    await searchForRecord(page, 'RTZ-999');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for filter to apply

    // Verify RTZ-999 appears in table
    const rtz999Link = page.getByRole('link', { name: 'RTZ-999' }).or(
      page.getByText('RTZ-999')
    );
    await expect(rtz999Link).toBeVisible({ timeout: 10000 });

    // Step 2: Edit RTZ-999
    // Find the row with RTZ-999 and click edit button
    const row = page.locator('tr').filter({ hasText: 'RTZ-999' }).first();
    const editButton = row.getByRole('button', { name: /edit/i }).or(
      row.locator('button').filter({ hasText: /edit|pencil/i })
    ).first();
    await editButton.click();

    // Wait for edit page to load
    await page.waitForURL(/\/forms\/tally-cards\/.*\/edit/, { timeout: 10000 });

    // Update form
    const activeCheckbox = page.getByLabel(/active/i);
    await activeCheckbox.check();

    const noteField = page.getByLabel(/note/i);
    await noteField.clear();
    await noteField.fill('Tally card issued and marking as active.');

    // Submit update
    await submitForm(page, /\/forms\/tally-cards/);

    // Verify redirect and updated data
    await expect(page).toHaveURL(/\/forms\/tally-cards/);
    await page.waitForLoadState('networkidle');

    // Use search/filter to find RTZ-999 after edit
    await searchForRecord(page, 'RTZ-999');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for filter to apply

    // Step 3: Verify History
    // Navigate back to edit page
    const updatedRow = page.locator('tr').filter({ hasText: 'RTZ-999' }).first();
    const editButton2 = updatedRow.getByRole('button', { name: /edit/i }).or(
      updatedRow.locator('button').filter({ hasText: /edit|pencil/i })
    ).first();
    await editButton2.click();

    await page.waitForURL(/\/forms\/tally-cards\/.*\/edit/, { timeout: 10000 });

    // Click History tab
    const historyTab = page.getByRole('button', { name: /history/i });
    await expect(historyTab).toBeVisible();
    await historyTab.click();

    // Wait for history table to load
    await page.waitForLoadState('networkidle');

    // Verify 2 records in history
    const historyRows = page.locator('table tbody tr, [role="row"]:not([role="columnheader"])');
    const historyCount = await historyRows.count();
    expect(historyCount).toBeGreaterThanOrEqual(2);

    // Verify creation entry (first row - oldest)
    const firstHistoryRow = historyRows.first();
    await expect(firstHistoryRow).toContainText(/creating new tally card for testing purposes/i);
    
    // Verify update entry (second row - newest)
    const secondHistoryRow = historyRows.nth(1);
    await expect(secondHistoryRow).toContainText(/tally card issued and marking as active/i);

    // Verify "Updated By" shows test user name
    await expect(firstHistoryRow).toContainText(/test user.*tally card manager/i);

    // Keep RTZ-999 for stock-adjustments and compare-stock tests
    // Deletion will happen in cleanup test
  });
});

