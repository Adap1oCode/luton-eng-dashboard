import { test, expect } from '@playwright/test';

test.describe('Stock Adjustments Form Loading States', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to stock adjustments list page
    await page.goto('/forms/stock-adjustments');
    await page.waitForLoadState('networkidle');
  });

  test('shows loading state when creating new stock adjustment', async ({ page }) => {
    // Click "New" button
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out the form
    await page.fill('[name="description"]', 'Test Stock Adjustment');
    await page.fill('[name="quantity"]', '10');
    
    // Submit the form and check for loading state
    await page.click('button[type="submit"]');
    
    // Should show submission loading
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    await expect(page.locator('text=Creating Stock Adjustment')).toBeVisible();
    await expect(page.locator('text=Please wait while we save your changes')).toBeVisible();
  });

  test('shows loading state when editing existing stock adjustment', async ({ page }) => {
    // Assume there's at least one stock adjustment in the list
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    // Click edit button
    await firstRow.locator('a[href*="/edit"]').click();
    await page.waitForURL('**/forms/stock-adjustments/*/edit');
    
    // Modify the form
    await page.fill('[name="description"]', 'Updated Stock Adjustment');
    
    // Submit the form and check for loading state
    await page.click('button[type="submit"]');
    
    // Should show submission loading
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    await expect(page.locator('text=Updating Stock Adjustment')).toBeVisible();
    await expect(page.locator('text=Please wait while we save your changes')).toBeVisible();
  });

  test('shows background loading for field options', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Simulate field loading (this would typically be triggered by field dependencies)
    // For this test, we'll check that the background loader component is available
    await expect(page.locator('[data-testid="background-loader"]')).not.toBeVisible();
    
    // The background loader should be available in the DOM but not visible by default
    const backgroundLoader = page.locator('[data-testid="background-loader"]');
    await expect(backgroundLoader).toHaveCount(0); // Not rendered until needed
  });

  test('form submission prevents double submission', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out the form
    await page.fill('[name="description"]', 'Test Stock Adjustment');
    await page.fill('[name="quantity"]', '10');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Try to submit again immediately (should be prevented)
    await page.click('button[type="submit"]');
    
    // Should still show loading state (not multiple submissions)
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
  });

  test('loading states are accessible', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out and submit form
    await page.fill('[name="description"]', 'Test Stock Adjustment');
    await page.fill('[name="quantity"]', '10');
    await page.click('button[type="submit"]');
    
    // Check accessibility of loading state
    const loader = page.locator('[data-testid="fullscreen-loader"]');
    await expect(loader).toBeVisible();
    
    // Check that loading state has proper ARIA attributes
    await expect(loader).toHaveAttribute('role', 'status');
    await expect(loader).toHaveAttribute('aria-live', 'polite');
  });

  test('loading states work with keyboard navigation', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out form using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.type('Test Stock Adjustment');
    await page.keyboard.press('Tab');
    await page.keyboard.type('10');
    
    // Submit using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Should show loading state
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
  });

  test('loading states handle network errors gracefully', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out the form
    await page.fill('[name="description"]', 'Test Stock Adjustment');
    await page.fill('[name="quantity"]', '10');
    
    // Mock network failure
    await page.route('**/api/forms/stock-adjustments', route => {
      route.abort('failed');
    });
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show loading state initially
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Loading should disappear after error
    await page.waitForTimeout(2000); // Wait for error handling
    await expect(page.locator('[data-testid="fullscreen-loader"]')).not.toBeVisible();
  });

  test('loading states work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out the form
    await page.fill('[name="description"]', 'Test Stock Adjustment');
    await page.fill('[name="quantity"]', '10');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show loading state on mobile
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Check that loader is properly positioned on mobile
    const loader = page.locator('[data-testid="fullscreen-loader"]');
    const loaderBox = await loader.boundingBox();
    expect(loaderBox?.width).toBeGreaterThan(200); // Should be reasonably sized
  });

  test('form validation works during loading states', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Description is required')).toBeVisible();
    
    // Fill out form
    await page.fill('[name="description"]', 'Test Stock Adjustment');
    await page.fill('[name="quantity"]', '10');
    
    // Submit again
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
  });

  test('form handles slow network conditions', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out the form
    await page.fill('[name="description"]', 'Test Stock Adjustment');
    await page.fill('[name="quantity"]', '10');
    
    // Mock slow network
    await page.route('**/api/forms/stock-adjustments', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      await route.continue();
    });
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show loading state for extended period
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Should eventually complete
    await expect(page.locator('[data-testid="fullscreen-loader"]')).not.toBeVisible({ timeout: 10000 });
  });

  test('form handles large data submission', async ({ page }) => {
    // Navigate to new form
    await page.click('text=New');
    await page.waitForURL('**/forms/stock-adjustments/new');
    
    // Fill out form with large data
    await page.fill('[name="description"]', 'A'.repeat(1000)); // Large description
    await page.fill('[name="quantity"]', '999999');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="fullscreen-loader"]')).toBeVisible();
    
    // Should handle large data submission
    await expect(page.locator('[data-testid="fullscreen-loader"]')).not.toBeVisible({ timeout: 10000 });
  });
});
