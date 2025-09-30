// src/lib/supabase.ts
import { cookies } from "next/headers";

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Client-side Supabase (use inside `"use client"` components) */
export function supabaseBrowser(): SupabaseClient {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

/** Server-side Supabase (Server Components / Route Handlers / Server Actions) */
export async function supabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      // Required by @supabase/ssr
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

/**
 * Compatibility shim so existing code like
 *   `import { supabase } from "@/lib/supabase"`
 * continues to work **in client components**.
 * For server files, import and use `supabaseServer()` instead.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = supabaseBrowser() as any;
    return client[prop as keyof SupabaseClient];
  },
});
