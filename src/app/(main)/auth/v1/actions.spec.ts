import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMagicLink } from './actions';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

// Mock Supabase
const mockSupabase = {
  auth: {
    signInWithOtp: vi.fn(),
  },
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock headers function
    const mockHeaders = vi.fn().mockResolvedValue({
      get: (key: string) => {
        if (key === 'x-forwarded-host') return 'localhost:3000';
        if (key === 'x-forwarded-proto') return 'http';
        return null;
      },
    });
    
    // Mock the headers function directly
    vi.mocked(require('next/headers')).headers = mockHeaders;
  });

  describe('sendMagicLink', () => {
    it('should send magic link with correct parameters', async () => {
      const mockCookies = vi.fn().mockResolvedValue({
        getAll: () => [],
        set: vi.fn(),
      });
      
      const mockHeaders = vi.fn().mockResolvedValue({
        get: (key: string) => {
          if (key === 'x-forwarded-host') return 'localhost:3000';
          if (key === 'x-forwarded-proto') return 'http';
          return null;
        },
      });

      vi.mocked(require('next/headers')).cookies = mockCookies;
      vi.mocked(require('next/headers')).headers = mockHeaders;

      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

      await sendMagicLink('test@example.com', 'http://localhost:3000', '/dashboard');

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/v1/callback?next=%2Fdashboard',
          shouldCreateUser: true,
        },
      });
    });

    it('should sanitize next parameter to prevent external redirects', async () => {
      const mockCookies = vi.fn().mockResolvedValue({
        getAll: () => [],
        set: vi.fn(),
      });
      
      const mockHeaders = vi.fn().mockResolvedValue({
        get: (key: string) => {
          if (key === 'x-forwarded-host') return 'localhost:3000';
          if (key === 'x-forwarded-proto') return 'http';
          return null;
        },
      });

      vi.mocked(require('next/headers')).cookies = mockCookies;
      vi.mocked(require('next/headers')).headers = mockHeaders;

      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

      // Test with external URL - should be sanitized to /dashboard
      await sendMagicLink('test@example.com', 'http://localhost:3000', 'https://evil.com/steal-data');

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/v1/callback?next=%2Fdashboard',
          shouldCreateUser: true,
        },
      });
    });

    it('should use site URL from environment when available', async () => {
      const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_SITE_URL = 'https://myapp.com';

      const mockCookies = vi.fn().mockResolvedValue({
        getAll: () => [],
        set: vi.fn(),
      });
      
      const mockHeaders = vi.fn().mockResolvedValue({
        get: (key: string) => {
          if (key === 'x-forwarded-host') return 'localhost:3000';
          if (key === 'x-forwarded-proto') return 'http';
          return null;
        },
      });

      vi.mocked(require('next/headers')).cookies = mockCookies;
      vi.mocked(require('next/headers')).headers = mockHeaders;

      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

      await sendMagicLink('test@example.com', 'http://localhost:3000', '/dashboard');

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'https://myapp.com/auth/v1/callback?next=%2Fdashboard',
          shouldCreateUser: true,
        },
      });

      // Restore original value
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    });

    it('should throw error when Supabase signInWithOtp fails', async () => {
      const mockCookies = vi.fn().mockResolvedValue({
        getAll: () => [],
        set: vi.fn(),
      });
      
      const mockHeaders = vi.fn().mockResolvedValue({
        get: (key: string) => {
          if (key === 'x-forwarded-host') return 'localhost:3000';
          if (key === 'x-forwarded-proto') return 'http';
          return null;
        },
      });

      vi.mocked(require('next/headers')).cookies = mockCookies;
      vi.mocked(require('next/headers')).headers = mockHeaders;

      const errorMessage = 'Invalid email address';
      mockSupabase.auth.signInWithOtp.mockResolvedValue({ 
        error: { message: errorMessage } 
      });

      await expect(sendMagicLink('invalid-email', 'http://localhost:3000', '/dashboard'))
        .rejects.toThrow(errorMessage);
    });

    it('should handle missing headers gracefully', async () => {
      const mockCookies = vi.fn().mockResolvedValue({
        getAll: () => [],
        set: vi.fn(),
      });
      
      const mockHeaders = vi.fn().mockResolvedValue({
        get: () => null,
      });

      vi.mocked(require('next/headers')).cookies = mockCookies;
      vi.mocked(require('next/headers')).headers = mockHeaders;

      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

      await sendMagicLink('test@example.com', 'http://localhost:3000', '/dashboard');

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/v1/callback?next=%2Fdashboard',
          shouldCreateUser: true,
        },
      });
    });
  });
});
