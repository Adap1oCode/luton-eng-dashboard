import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for the page to load
    await expect(page).toHaveTitle(/IMS Admin/);
    
    // Check if the main dashboard content is visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check if sidebar is present
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Check if main content area is present
    await expect(page.locator('main')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Check if mobile navigation works
    await expect(page.locator('main')).toBeVisible();
  });
});

