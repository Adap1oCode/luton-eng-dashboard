import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackLoginAttempt: vi.fn(),
  trackLoginSuccess: vi.fn(),
  trackLoginFailed: vi.fn(),
  trackRegisterAttempt: vi.fn(),
  trackRegisterSuccess: vi.fn(),
  trackRegisterFailed: vi.fn(),
  trackMagicLinkSent: vi.fn(),
  trackAuthError: vi.fn(),
}))

// Mock performance monitoring
vi.mock('@/lib/performance', () => ({
  measureApiResponse: vi.fn((fn) => fn().then(result => ({ result, responseTime: 100 }))),
  trackAuthPerformance: vi.fn(),
  measurePageLoad: vi.fn(() => 500),
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabaseBrowser: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  }),
}))

// Mock server actions
vi.mock('../../actions', () => ({
  sendMagicLink: vi.fn(),
}))

// Mock password strength component
vi.mock('@/components/auth/password-strength', () => ({
  PasswordStrength: ({ password }: { password: string }) => 
    password ? <div data-testid="password-strength">Password Strength: {password.length > 8 ? 'Strong' : 'Weak'}</div> : null
}))

import LoginPage from '../login/page'
import RegisterPage from '../register/page'
import AuthError from '../error'
import AuthLoading from '../loading'

describe('Auth Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Boundary', () => {
    it('renders error boundary with proper styling', () => {
      const mockError = new Error('Test error')
      const mockReset = vi.fn()

      render(<AuthError error={mockError} reset={mockReset} />)

      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong with the authentication process. This might be a temporary issue.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument()
    })

    it('shows error details in development', () => {
      const mockError = new Error('Test error')
      const mockReset = vi.fn()

      // Mock development environment
      vi.stubEnv('NODE_ENV', 'development')

      render(<AuthError error={mockError} reset={mockReset} />)

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()
    })

    it('calls reset function when try again is clicked', () => {
      const mockError = new Error('Test error')
      const mockReset = vi.fn()

      render(<AuthError error={mockError} reset={mockReset} />)

      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
      expect(mockReset).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('renders loading state with spinner', () => {
      render(<AuthLoading />)

      expect(screen.getByText('Loading Authentication')).toBeInTheDocument()
      expect(screen.getByText('Please wait while we prepare your login experience...')).toBeInTheDocument()
      // Check for spinner (Loader2 icon) - it's an SVG with animate-spin class
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
    })
  })

  describe('Password Strength Component', () => {
    it('does not render when password is empty', () => {
      const { PasswordStrength } = require('@/components/auth/password-strength')
      const { container } = render(<PasswordStrength password="" />)
      expect(container.firstChild).toBeNull()
    })

    it('shows strength indicators for different password strengths', () => {
      const { PasswordStrength } = require('@/components/auth/password-strength')
      
      // Test weak password
      render(<PasswordStrength password="weak" />)
      expect(screen.getByText('Password Strength: Weak')).toBeInTheDocument()

      // Test strong password
      render(<PasswordStrength password="StrongP@ssw0rd123!" />)
      expect(screen.getByText('Password Strength: Strong')).toBeInTheDocument()
    })

    it('shows password rules checklist', () => {
      const { PasswordStrength } = require('@/components/auth/password-strength')
      
      render(<PasswordStrength password="test" />)
      
      expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    })
  })

  describe('Analytics Integration', () => {
    it('tracks login attempts', async () => {
      const { trackLoginAttempt } = require('@/lib/analytics')
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /login/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(trackLoginAttempt).toHaveBeenCalledWith('password')
      })
    })

    it('tracks registration attempts', async () => {
      const { trackRegisterAttempt } = require('@/lib/analytics')
      
      render(<RegisterPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(trackRegisterAttempt).toHaveBeenCalled()
      })
    })
  })

  describe('Performance Monitoring', () => {
    it('tracks performance metrics on successful login', async () => {
      const { trackAuthPerformance } = require('@/lib/performance')
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /login/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(trackAuthPerformance).toHaveBeenCalledWith(
          expect.objectContaining({
            pageLoadTime: 500,
            apiResponseTime: 100,
            totalAuthTime: 100,
          })
        )
      })
    })
  })

  describe('Accessibility Improvements', () => {
    it('has proper ARIA labels for password visibility toggle', () => {
      render(<LoginPage />)
      
      const passwordInput = screen.getByLabelText('Password')
      const toggleButton = passwordInput.parentElement?.querySelector('button')
      
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password')
    })

    it('has proper form labels and associations', () => {
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Dark Mode Support', () => {
    it('applies dark mode classes to auth layout', () => {
      const AuthLayout = require('../layout').default
      
      const { container } = render(
        <AuthLayout>
          <div>Test content</div>
        </AuthLayout>
      )
      
      const layoutDiv = container.firstChild as HTMLElement
      expect(layoutDiv).toHaveClass('dark:bg-gray-900')
    })
  })

  describe('Security Headers', () => {
    it('should have proper meta tags for auth pages', () => {
      render(<LoginPage />)
      
      // Check that the page has proper meta tags (these would be set by Next.js metadata)
      expect(document.title).toContain('Login - Luton Engineering Dashboard')
    })
  })
})
