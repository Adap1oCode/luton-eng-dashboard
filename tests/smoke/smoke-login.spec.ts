import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Smoke Tests - Login @smoke', () => {
  test('should login successfully and redirect to default homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Perform login
    await login(page);

    // Verify we're on the default homepage (/forms/tally-cards)
    await expect(page).toHaveURL(/\/forms\/tally-cards/);

    // Verify sidebar loads (look for sidebar or navigation)
    const sidebar = page.getByRole('complementary').or(
      page.locator('[data-testid="sidebar"], [aria-label*="sidebar" i]')
    );
    await expect(sidebar.first()).toBeVisible({ timeout: 5000 });

    // Verify no console errors
    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0);
  });
});


