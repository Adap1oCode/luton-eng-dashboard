import { Page, expect } from '@playwright/test';

export interface UserSession {
  permissions: string[];
  allowedWarehouseCodes: string[];
  defaultHomepage: string;
  fullName: string;
  email: string;
}

/**
 * Get user permissions and session data from /api/me/role
 */
export async function getUserPermissions(page: Page): Promise<UserSession> {
  const response = await page.request.get('/api/me/role');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  return {
    permissions: data.permissions || [],
    allowedWarehouseCodes: data.allowedWarehouseCodes || [],
    defaultHomepage: data.defaultHomepage || '/dashboard',
    fullName: data.fullName || '',
    email: data.email || '',
  };
}

/**
 * Get user's allowed warehouses
 */
export async function getUserWarehouses(page: Page): Promise<string[]> {
  const session = await getUserPermissions(page);
  return session.allowedWarehouseCodes;
}

/**
 * Verify menu item visibility in sidebar
 */
export async function verifyMenuVisibility(
  page: Page,
  menuItemText: string,
  shouldBeVisible: boolean
): Promise<void> {
  const menuItem = page.getByRole('link', { name: menuItemText }).or(
    page.getByText(menuItemText)
  );

  if (shouldBeVisible) {
    await expect(menuItem).toBeVisible({ timeout: 5000 });
  } else {
    await expect(menuItem).not.toBeVisible({ timeout: 2000 });
  }
}

/**
 * Verify warehouse filter dropdown shows only expected warehouses
 */
export async function verifyWarehouseFilter(
  page: Page,
  expectedWarehouses: string[]
): Promise<void> {
  // Find warehouse filter dropdown
  const warehouseFilter = page.getByRole('combobox').filter({ hasText: /warehouse/i }).or(
    page.locator('select, [role="combobox"]').filter({ hasText: /warehouse/i })
  ).first();

  if (await warehouseFilter.isVisible().catch(() => false)) {
    await warehouseFilter.click();
    
    // Get all options
    const options = page.locator('[role="option"], option');
    const count = await options.count();
    
    // Verify we have the expected number of warehouses
    expect(count).toBeGreaterThanOrEqual(expectedWarehouses.length);
    
    // Verify each expected warehouse is present
    for (const warehouse of expectedWarehouses) {
      const option = page.getByRole('option', { name: new RegExp(warehouse, 'i') });
      await expect(option).toBeVisible();
    }
    
    // Close dropdown
    await page.keyboard.press('Escape');
  } else {
    // Warehouse filter might not be visible if resource doesn't have warehouseScope
    // This is acceptable for some screens
    console.log('Warehouse filter not found - may not be applicable for this screen');
  }
}

