import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginFormV1 } from './login/_components/login-form';
import { RegisterFormV1 } from './register/_components/register-form';

// Mock window.location
Object.defineProperty(global, 'window', {
  value: {
    location: {
    href: '',
    origin: 'http://localhost:3000',
    search: '',
    },
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

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginFormV1', () => {
    it('should render login form correctly', () => {
      render(<LoginFormV1 />);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('should show validation errors for invalid input', async () => {
      const user = userEvent.setup();
      render(<LoginFormV1 />);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      });
    });

    it('should handle form submission', async () => {
      const user = userEvent.setup();
      render(<LoginFormV1 />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Form should be in loading state
      expect(submitButton).toBeDisabled();
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

    it('should show validation errors for invalid input', async () => {
      const user = userEvent.setup();
      render(<RegisterFormV1 />);
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      });
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

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      });
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

      // Form should be in loading state
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Cross-component Integration', () => {
    it('should render both forms without conflicts', () => {
      render(<LoginFormV1 />);
      expect(screen.getByText('Login')).toBeInTheDocument();
      
      // Test that both forms can be rendered without conflicts
      render(<RegisterFormV1 />);
      expect(screen.getByText('Create an account')).toBeInTheDocument();
    });
  });
});