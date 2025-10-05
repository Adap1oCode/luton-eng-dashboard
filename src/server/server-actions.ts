// Supabase helper usable in Server Actions / Route Handlers
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseServer } from "@/lib/supabase-server";

export async function supabaseServerAction(): Promise<SupabaseClient> {
  // Reuse the canonical server-side client which already handles cookie wiring safely
  return supabaseServer();
}
