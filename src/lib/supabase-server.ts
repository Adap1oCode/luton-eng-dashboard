// src/lib/supabase-server.ts

import "server-only";

import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server Components / layouts helper
 * - Your Next version exposes `cookies()` as async → we await it here.
 * - Read-only cookie access (no set/remove in RSC).
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies(); // <- async in your setup

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Intentionally no set/remove: RSC is read-only for cookies.
    },
  });
}
