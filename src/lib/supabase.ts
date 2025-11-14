// src/lib/supabase.ts
// CLIENT-ONLY helpers. Do not import this file from server code.
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// ✅ Use STATIC env access so Next can inline values in the client bundle.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Fail fast during dev if vars are missing (remember to restart dev server after editing .env.local)
// Only throw in browser context - server code should never import this file
if (typeof window !== "undefined" && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Ensure they exist in .env.local and restart the dev server."
  );
}

/** Use inside `"use client"` components only */
export function supabaseBrowser(): SupabaseClient {
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

/**
 * Optional convenience: a client-only shim so existing code like
 *   `import { supabase } from "@/lib/supabase"`
 * keeps working **in client components**.
 * Do NOT use this in server files—use `supabaseServer()` from "@/lib/supabase-server".
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = supabaseBrowser() as any;
    return client[prop as keyof SupabaseClient];
  },
});
