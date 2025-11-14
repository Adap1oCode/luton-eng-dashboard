import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/obs/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserLite = { id: string; full_name: string | null; email: string | null };

// Map view columns to expected format (user_id -> id)
function mapViewRowToUserLite(row: { user_id: string; full_name: string | null; email: string | null }): UserLite {
  return {
    id: row.user_id,
    full_name: row.full_name,
    email: row.email,
  };
}

export async function GET() {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Query mv_effective_permissions view for consistent data source
    // The view includes user_id, full_name, email (and permissions/role data)
    const { data, error } = await supabase
      .from("mv_effective_permissions")
      .select("user_id, full_name, email")
      .order("full_name", { ascending: true });

    if (error) {
      logger.error({
        component: "api/admin/users",
        function: "GET",
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      }, "Failed to query mv_effective_permissions view");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map view rows to UserLite format (user_id -> id)
    const users = (data ?? []).map(mapViewRowToUserLite);
    return NextResponse.json(users, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error({
      component: "api/admin/users",
      function: "GET",
      error: err instanceof Error ? {
        message: err.message,
        stack: err.stack,
        name: err.name,
      } : String(err),
    }, "Unexpected error in GET /api/admin/users");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
