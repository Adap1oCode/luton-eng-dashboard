import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { getUserPermissions, verifyMenuVisibility, verifyWarehouseFilter } from './helpers/permissions';

test.describe('Smoke Tests - Permissions @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show correct menu items based on permissions', async ({ page }) => {
    const session = await getUserPermissions(page);

    // Verify user has expected permissions
    expect(session.permissions).toContain('screen:tally-cards:view');
    expect(session.permissions).toContain('screen:stock-adjustments:view');
    expect(session.permissions).toContain('screen:compare-stock:view');
    expect(session.permissions).toContain('screen:switch-user:view');
    expect(session.permissions).toContain('screen:account:view');
    expect(session.permissions).toContain('screen:notifications:view');

    // Verify sidebar menu items are visible
    await verifyMenuVisibility(page, 'Tally Cards', true);
    await verifyMenuVisibility(page, 'Stock Adjustments', true);
    await verifyMenuVisibility(page, 'Compare Stock', true);
  });

  test('should show correct user menu items based on permissions', async ({ page }) => {
    // Open user menu dropdown
    const userMenu = page.locator('[aria-label*="user" i], button').filter({ 
      hasText: /test user|tally card manager/i 
    }).first();
    
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      
      // Verify Account menu item is visible (gated by screen:account:view)
      const accountItem = page.getByRole('menuitem', { name: /account/i });
      await expect(accountItem).toBeVisible();

      // Verify Notifications menu item is visible (gated by screen:notifications:view)
      const notificationsItem = page.getByRole('menuitem', { name: /notifications/i });
      await expect(notificationsItem).toBeVisible();

      // Verify Switch User menu item is visible (gated by screen:switch-user:view)
      const switchUserItem = page.getByRole('menuitem', { name: /switch user/i });
      await expect(switchUserItem).toBeVisible();
    }
  });

  test('should show only allowed warehouses in warehouse filter', async ({ page }) => {
    const session = await getUserPermissions(page);
    
    // Navigate to a screen with warehouse filter
    await page.goto('/forms/tally-cards');
    await page.waitForLoadState('networkidle');

    // Verify warehouse filter shows only RTZ - WH 1
    await verifyWarehouseFilter(page, ['RTZ']);
  });
});


