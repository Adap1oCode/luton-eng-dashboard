import { test, expect } from '@playwright/test'

test.describe('Auth Improvements E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth pages
    await page.goto('/auth/login')
  })

  test('should display pure login screen without main app UI', async ({ page }) => {
    // Verify no sidebar
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="app-sidebar"]')).not.toBeVisible()
    
    // Verify no header with theme switcher
    await expect(page.locator('[data-testid="header"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="theme-switcher"]')).not.toBeVisible()
    
    // Verify login form is present
    await expect(page.locator('h1:has-text("Login")')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should display pure register screen without main app UI', async ({ page }) => {
    await page.goto('/auth/register')
    
    // Verify no sidebar
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="app-sidebar"]')).not.toBeVisible()
    
    // Verify no header
    await expect(page.locator('[data-testid="header"]')).not.toBeVisible()
    
    // Verify register form is present
    await expect(page.locator('h1:has-text("Create an account")')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should show password strength indicator on register page', async ({ page }) => {
    await page.goto('/auth/register')
    
    const passwordInput = page.locator('input[type="password"]').first()
    
    // Type a weak password
    await passwordInput.fill('weak')
    
    // Should show password strength indicator
    await expect(page.locator('text=Password Strength')).toBeVisible()
    await expect(page.locator('text=Very Weak')).toBeVisible()
    
    // Type a strong password
    await passwordInput.fill('StrongP@ssw0rd123!')
    
    // Should show strong indicator
    await expect(page.locator('text=Strong')).toBeVisible()
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check password visibility toggle has proper ARIA label
    const passwordInput = page.locator('input[type="password"]')
    const toggleButton = passwordInput.locator('..').locator('button')
    
    await expect(toggleButton).toHaveAttribute('aria-label', 'Show password')
    
    // Check form has proper labels
    await expect(page.locator('label:has-text("Email Address")')).toBeVisible()
    await expect(page.locator('label:has-text("Password")')).toBeVisible()
  })

  test('should handle dark mode correctly', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check that dark mode classes are applied to the layout
    const body = page.locator('body')
    await expect(body).toHaveClass(/dark:bg-gray-900/)
  })

  test('should show loading state when navigating between auth pages', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login')
    
    // Click register link
    await page.click('text=Register')
    
    // Should show loading state briefly
    await expect(page.locator('text=Loading Authentication')).toBeVisible({ timeout: 1000 })
    
    // Should then show register page
    await expect(page.locator('h1:has-text("Create an account")')).toBeVisible()
  })

  test('should show error boundary on auth errors', async ({ page }) => {
    // Mock an error by navigating to a non-existent auth route
    await page.goto('/auth/nonexistent')
    
    // Should show error boundary
    await expect(page.locator('text=Authentication Error')).toBeVisible()
    await expect(page.locator('text=Something went wrong')).toBeVisible()
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
  })

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/auth/login')
    
    // Check for security headers
    const headers = response?.headers()
    expect(headers?.['x-frame-options']).toBe('DENY')
    expect(headers?.['x-content-type-options']).toBe('nosniff')
    expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('should track analytics events on form submission', async ({ page }) => {
    // Mock analytics
    await page.addInitScript(() => {
      window.gtag = (event, action, params) => {
        console.log('Analytics event:', event, action, params)
      }
    })
    
    await page.goto('/auth/login')
    
    // Fill form and submit
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Check console for analytics events
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('Analytics event:')) {
        logs.push(msg.text())
      }
    })
    
    // Wait for analytics events
    await page.waitForTimeout(1000)
    
    // Should have tracked login attempt
    expect(logs.some(log => log.includes('login_attempt'))).toBeTruthy()
  })

  test('should handle rate limiting gracefully', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Make multiple rapid requests to test rate limiting
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(
        page.request.post('/api/auth/login', {
          data: { email: 'test@example.com', password: 'wrongpassword' }
        })
      )
    }
    
    const responses = await Promise.all(promises)
    
    // Some requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429)
    expect(rateLimitedResponses.length).toBeGreaterThan(0)
  })

  test('should measure performance metrics', async ({ page }) => {
    // Start performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('auth-start')
    })
    
    await page.goto('/auth/login')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      }
    })
    
    expect(metrics.loadTime).toBeLessThan(3000) // Should load within 3 seconds
    expect(metrics.domContentLoaded).toBeLessThan(2000) // DOM should be ready within 2 seconds
  })

  test('should have proper SEO meta tags', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check meta tags
    const title = await page.title()
    expect(title).toContain('Login - Luton Engineering Dashboard')
    
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots).toBe('noindex, nofollow')
    
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description).toContain('Sign in to your Luton Engineering Dashboard account')
  })
})
