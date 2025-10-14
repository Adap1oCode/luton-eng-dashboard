// src/server/user-role.ts
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Returns { userId, email, roleCode } for the current session user,
 * or null if unauthenticated or user row not found.
 */
export async function getCurrentUserRole() {
  const sb = await supabaseServer();

  const { data: auth } = await sb.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return null;

  // Adjust column names if yours differ: users.role_id → roles.id ↔ roles.role_code
  const { data, error } = await sb
    .from("users")
    .select("id, email, role:roles(role_code)")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    userId: data.id as string,
    email: data.email as string | null,
    roleCode: (data as any).role?.role_code as string | null,
  };
}
