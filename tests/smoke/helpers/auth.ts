import { Page } from '@playwright/test';

/**
 * Login helper function
 * Reads credentials from environment variables and performs login
 */
export async function login(
  page: Page,
  email?: string,
  password?: string
): Promise<void> {
  const testEmail = email || process.env.TC_MANAGER_TEST_USER_EMAIL;
  const testPassword = password || process.env.TC_MANAGER_TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error(
      'Test credentials not found. Please set TC_MANAGER_TEST_USER_EMAIL and TC_MANAGER_TEST_USER_PASSWORD in .env.local'
    );
  }

  // Navigate to login page
  await page.goto('/auth/login');

  // Fill email
  await page.getByLabel('Email Address').fill(testEmail);

  // Fill password
  await page.getByLabel('Password').fill(testPassword);

  // Click login button
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for redirect to default homepage (/forms/tally-cards for this user)
  await page.waitForURL(/\/forms\/tally-cards/, { timeout: 10000 });
}

