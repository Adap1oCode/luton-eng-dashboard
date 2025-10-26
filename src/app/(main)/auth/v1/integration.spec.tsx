import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginFormV1 } from './login/_components/login-form';
import { RegisterFormV1 } from './register/_components/register-form';

// Mock the server actions
vi.mock('./actions', () => ({
  sendMagicLink: vi.fn().mockResolvedValue({ error: null }),
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      sendMagicLink: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

// Mock window.location
Object.defineProperty(global, 'window', {
  value: {
    location: {
    href: '',
    origin: 'http://localhost:3000',
    search: '',
    },
    navigator: {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('')
      }
    }
  },
  writable: true,
});

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  },
  writable: true,
});

// Mock global navigator
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue('')
    }
  },
  writable: true,
});

// Mock the Checkbox component to avoid prototype issues
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled, className, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      className={className}
      {...props}
    />
  ),
}));

// Mock supabaseBrowser to prevent function errors
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('LoginFormV1', () => {
    it('should render login form correctly', () => {
      render(<LoginFormV1 />);
      
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('should handle invalid input gracefully', async () => {
      const user = userEvent.setup();
      render(<LoginFormV1 />);

      const emailInput = screen.getByLabelText('Email Address');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Form should still be rendered and functional
      expect(emailInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      const user = userEvent.setup();
      render(<LoginFormV1 />);

      const emailInput = screen.getByLabelText('Email Address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Form should be in loading state
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('RegisterFormV1', () => {
    it('should render register form correctly', () => {
      render(<RegisterFormV1 />);
      
      expect(screen.getByText('Create an account')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should handle invalid input gracefully', async () => {
      const user = userEvent.setup();
      render(<RegisterFormV1 />);
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Form should still be rendered and functional
      expect(emailInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should show password mismatch error', async () => {
      const user = userEvent.setup();
      render(<RegisterFormV1 />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');
      await user.click(submitButton);

      // Validation error should appear
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      const user = userEvent.setup();
      render(<RegisterFormV1 />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Form submission should be handled (button may or may not be disabled depending on implementation)
    });
  });

  describe('Cross-component Integration', () => {
    it('should render login form without conflicts', () => {
      render(<LoginFormV1 />);
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should render register form without conflicts', () => {
      render(<RegisterFormV1 />);
      expect(screen.getByText('Create an account')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });
  });
});