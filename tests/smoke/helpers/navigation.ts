import { Page, expect } from '@playwright/test';

/**
 * Navigate to a specific screen
 */
export async function navigateToScreen(page: Page, screenName: string): Promise<void> {
  const routes: Record<string, string> = {
    'tally-cards': '/forms/tally-cards',
    'stock-adjustments': '/forms/stock-adjustments',
    'compare-stock': '/forms/compare-stock',
  };

  const route = routes[screenName];
  if (!route) {
    throw new Error(`Unknown screen: ${screenName}`);
  }

  await page.goto(route);
  await waitForTableLoad(page);
}

/**
 * Wait for table to load
 */
export async function waitForTableLoad(page: Page): Promise<void> {
  // Wait for table to be visible (look for table element or first row)
  await page.waitForSelector('table, [role="table"], [role="row"]', { timeout: 10000 });
  // Wait a bit more for data to load
  await page.waitForLoadState('networkidle');
}

/**
 * Get table row count (visible rows in the table)
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = await page.locator('table tbody tr, [role="row"]:not([role="columnheader"])').count();
  return rows;
}

/**
 * Get record count from page title/header
 */
export async function getRecordCountFromPage(page: Page): Promise<number> {
  // Try to find count in page title or header
  // Common patterns: "Tally Cards (150)", "Showing 150 records", etc.
  const title = await page.locator('h1, [data-testid="page-title"]').first().textContent();
  if (title) {
    const match = title.match(/\((\d+)\)|(\d+)\s+records?/i);
    if (match) {
      return parseInt(match[1] || match[2], 10);
    }
  }

  // Fallback: count table rows
  return await getTableRowCount(page);
}

/**
 * Search/filter for a specific record
 */
export async function searchForRecord(page: Page, searchTerm: string): Promise<void> {
  // Look for search input or global search
  const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(500); // Wait for search to execute
  } else {
    // Try filtering by column if search not available
    // This is screen-specific, may need to be customized
    throw new Error('Search input not found. Please implement screen-specific search.');
  }
}

