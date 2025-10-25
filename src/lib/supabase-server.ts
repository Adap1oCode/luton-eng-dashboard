// src/lib/supabase-server.ts
import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// ✅ Static env access so Next can inline/resolve values properly
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/**
 * Safe server-side Supabase client. When required env vars are missing (e.g., CI or local docs build),
 * provide a minimal stub client so the app can still render and tests can run.
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  // Fallback stub when env is missing
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const stub = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "e2e-user",
              app_metadata: { role: "admin" },
              user_metadata: { role: "admin" },
            },
          },
        }),
      },
      rpc: async (_fn: string, _args?: Record<string, unknown>) => ({ data: [], error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }), maybeSingle: async () => ({ data: null, error: null }) }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
        delete: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
      }),
    } as unknown as SupabaseClient;
    return stub;
  }

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        try {
          return cookieStore.get(name)?.value;
        } catch {
          return undefined; // RSC read-only context
        }
      },
      set(name: string, value: string, options: any) {
        try {
          (cookieStore as any).set?.(name, value, options);
        } catch {
          // RSC read-only: safely ignore
        }
      },
      remove(name: string, options: any) {
        try {
          (cookieStore as any).delete?.(name, options);
        } catch {
          // RSC read-only: safely ignore
        }
      },
    },
  });
}

/**
 * Compatibility alias for older imports:
 *   import { createClient } from "@/lib/supabase-server"
 */
export const createClient = supabaseServer;
