import { test, expect } from '@playwright/test';

test.describe('Stock Adjustments Loading States', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to stock adjustments list page
    await page.goto('/forms/stock-adjustments');
    await page.waitForLoadState('networkidle');
  });

  test('shows loading state when first visiting the page', async ({ page }) => {
    // Should show loading state initially
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    await expect(page.locator('text=Loading Stock Adjustments')).toBeVisible();
    await expect(page.locator('text=Fetching your data...')).toBeVisible();
    
    // Should show content after loading
    await expect(page.locator('text=Stock Adjustments')).toBeVisible();
    await expect(page.locator('[data-testid="fullscreen-loader"]')).not.toBeVisible();
  });

  test('shows background loading when refreshing data', async ({ page }) => {
    // Wait for initial load to complete
    await expect(page.locator('text=Stock Adjustments')).toBeVisible();
    
    // Trigger refresh (assuming there's a refresh button)
    await page.click('button[aria-label="Refresh"]');
    
    // Should show background loader
    await expect(page.locator('[data-testid="background-loader"]')).toBeVisible();
    await expect(page.locator('text=Updating...')).toBeVisible();
  });

  test('shows loading state when changing filters', async ({ page }) => {
    // Wait for initial load to complete
    await expect(page.locator('text=Stock Adjustments')).toBeVisible();
    
    // Change filter (assuming there's a status filter)
    await page.selectOption('select[name="status"]', 'PENDING');
    
    // Should show background loader during filter change
    await expect(page.locator('[data-testid="background-loader"]')).toBeVisible();
  });

  test('shows loading state when changing page', async ({ page }) => {
    // Wait for initial load to complete
    await expect(page.locator('text=Stock Adjustments')).toBeVisible();
    
    // Go to next page (assuming pagination exists)
    await page.click('button[aria-label="Next page"]');
    
    // Should show background loader during page change
    await expect(page.locator('[data-testid="background-loader"]')).toBeVisible();
  });

  test('shows loading state when changing page size', async ({ page }) => {
    // Wait for initial load to complete
    await expect(page.locator('text=Stock Adjustments')).toBeVisible();
    
    // Change page size
    await page.selectOption('select[name="pageSize"]', '25');
    
    // Should show background loader during page size change
    await expect(page.locator('[data-testid="background-loader"]')).toBeVisible();
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/v_tcm_user_tally_card_entries', route => {
      route.abort('failed');
    });
    
    // Navigate to page
    await page.goto('/forms/stock-adjustments');
    
    // Should show error state
    await expect(page.locator('text=Error Loading Stock Adjustments')).toBeVisible();
    await expect(page.locator('text=Retry')).toBeVisible();
  });

  test('loading states are accessible', async ({ page }) => {
    // Navigate to page
    await page.goto('/forms/stock-adjustments');
    
    // Check accessibility of loading state
    const loader = page.locator('[data-testid="fullscreen-loader"]');
    await expect(loader).toBeVisible();
    
    // Check that loading state has proper ARIA attributes
    await expect(loader).toHaveAttribute('role', 'status');
    await expect(loader).toHaveAttribute('aria-live', 'polite');
  });

  test('loading states work with keyboard navigation', async ({ page }) => {
    // Navigate to page
    await page.goto('/forms/stock-adjustments');
    
    // Wait for content to load
    await expect(page.locator('text=Stock Adjustments')).toBeVisible();
    
    // Use keyboard to navigate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate without issues
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('loading states work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to page
    await page.goto('/forms/stock-adjustments');
    
    // Should show loading state on mobile
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Check that loader is properly positioned on mobile
    const loader = page.locator('[data-testid="fullscreen-loader"]');
    const loaderBox = await loader.boundingBox();
    expect(loaderBox?.width).toBeGreaterThan(200); // Should be reasonably sized
  });

  test('loading states handle slow network conditions', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/v_tcm_user_tally_card_entries', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      await route.continue();
    });
    
    // Navigate to page
    await page.goto('/forms/stock-adjustments');
    
    // Should show loading state for extended period
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Should eventually show content
    await expect(page.locator('text=Stock Adjustments')).toBeVisible({ timeout: 10000 });
  });

  test('loading states work with different data sizes', async ({ page }) => {
    // Mock large dataset
    await page.route('**/api/v_tcm_user_tally_card_entries', async route => {
      const response = await route.fetch();
      const data = await response.json();
      
      // Simulate large dataset
      const largeData = {
        ...data,
        rows: Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          status: i % 2 === 0 ? 'active' : 'inactive',
          created_at: new Date().toISOString(),
        })),
        total: 1000,
      };
      
      await route.fulfill({
        response,
        body: JSON.stringify(largeData),
      });
    });
    
    // Navigate to page
    await page.goto('/forms/stock-adjustments');
    
    // Should show loading state
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Should eventually show content with large dataset
    await expect(page.locator('text=Stock Adjustments')).toBeVisible();
  });

  test('loading states work with empty data', async ({ page }) => {
    // Mock empty dataset
    await page.route('**/api/v_tcm_user_tally_card_entries', async route => {
      const response = await route.fetch();
      const data = await response.json();
      
      const emptyData = {
        ...data,
        rows: [],
        total: 0,
      };
      
      await route.fulfill({
        response,
        body: JSON.stringify(emptyData),
      });
    });
    
    // Navigate to page
    await page.goto('/forms/stock-adjustments');
    
    // Should show loading state
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Should show empty state
    await expect(page.locator('text=No data available')).toBeVisible();
  });
});
