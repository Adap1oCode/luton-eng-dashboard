// src/lib/supabase-server.ts
import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// ✅ Static env access so Next can inline/resolve values properly
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in server env. " +
      "Check your .env.local and restart the dev server."
  );
}

/**
 * Safe server-side Supabase client
 * - Use inside Server Components, Route Handlers, and Server Actions.
 * - In layouts/components (RSC), cookies are read-only → set/remove are no-ops.
 * - In actions/handlers, cookies are usually mutable → set/remove will succeed.
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
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
