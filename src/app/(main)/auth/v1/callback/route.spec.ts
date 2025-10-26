import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: vi.fn(),
    },
  })),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Auth Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET handler', () => {
    it('should redirect to login when no code is provided', async () => {
      const url = new URL('http://localhost:3000/auth/v1/callback');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fdashboard&error=missing_code');
    });

    it('should redirect to login with next parameter when no code is provided', async () => {
      const url = new URL('http://localhost:3000/auth/v1/callback?next=/profile');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fprofile&error=missing_code');
    });

    it('should handle successful code exchange', async () => {
      const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: mockExchangeCodeForSession,
        },
      };
      
      vi.mocked(require('@supabase/auth-helpers-nextjs').createRouteHandlerClient).mockImplementation(() => mockSupabase);
      
      const url = new URL('http://localhost:3000/auth/v1/callback?code=test-code&next=/dashboard');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code');
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });

    it('should redirect to login on code exchange error', async () => {
      const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ 
        error: { message: 'Invalid code' } 
      });
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: mockExchangeCodeForSession,
        },
      };
      
      vi.mocked(require('@supabase/auth-helpers-nextjs').createRouteHandlerClient).mockImplementation(() => mockSupabase);
      
      const url = new URL('http://localhost:3000/auth/v1/callback?code=invalid-code&next=/dashboard');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fdashboard&error=magic_link_failed');
    });

    it('should sanitize next parameter to prevent external redirects', async () => {
      const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: mockExchangeCodeForSession,
        },
      };
      
      vi.mocked(require('@supabase/auth-helpers-nextjs').createRouteHandlerClient).mockImplementation(() => mockSupabase);
      
      const url = new URL('http://localhost:3000/auth/v1/callback?code=test-code&next=https://evil.com/steal-data');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });

    it('should handle malformed next parameter gracefully', async () => {
      const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: mockExchangeCodeForSession,
        },
      };
      
      vi.mocked(require('@supabase/auth-helpers-nextjs').createRouteHandlerClient).mockImplementation(() => mockSupabase);
      
      const url = new URL('http://localhost:3000/auth/v1/callback?code=test-code&next=not-a-valid-path');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });
  });
});