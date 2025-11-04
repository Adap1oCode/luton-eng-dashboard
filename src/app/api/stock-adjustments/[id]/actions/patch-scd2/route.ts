// src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts
import { NextResponse } from "next/server";

import { awaitParams, type AwaitableParams } from "@/lib/next/server-helpers";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

export async function POST(req: Request, ctx: AwaitableParams<{ id: string }>) {
  const { id } = await awaitParams(ctx);
  if (!id || typeof id !== "string" || id.length > 128) {
    return json({ error: { message: "Invalid id parameter" } }, 400);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const sb = await createSupabaseServerClient();

  // Extract only the fields we need, excluding any legacy user_id field
  // The RPC function handles setting updated_by_user_id internally based on session context
  const { data, error } = await (sb as any).rpc("fn_user_entry_patch_scd2", {
    p_id: id,
    p_qty: payload?.qty ?? null,
    p_location: payload?.location ?? null,
    p_note: payload?.note ?? null,
  });

  if (error) {
    const status = /permission|rls|policy/i.test(error.message) ? 403 : 400;
    return json({ error: { message: error.message } }, status);
  }

  if (!data) {
    // No change
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  return json({ row: data }, 200);
}
