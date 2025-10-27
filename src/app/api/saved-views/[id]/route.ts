// src/app/api/saved-views/[id]/route.ts
// PATCH: update a view (name/description/state/isDefault)
// DELETE: delete a view

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx.params?.id;
    if (!id) return json({ error: { message: "Missing id" } }, 400);

    const patch = await req.json().catch(() => null);
    if (!patch || typeof patch !== "object") return json({ error: { message: "Invalid JSON body" } }, 400);

    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    const userId = (auth as any)?.user?.id as string | undefined;
    if (!userId) return json({ error: { message: "Unauthenticated" } }, 401);

    // Load existing (to get table_id for default unsetting)
    const { data: existing, error: getErr } = await sb
      .from("user_saved_views")
      .select("id, table_id")
      .eq("owner_auth_id", userId)
      .eq("id", id)
      .single();
    if (getErr || !existing) return json({ error: { message: "Not found" } }, 404);

    const updateRow: any = {};
    if (typeof patch.name === "string") updateRow.name = patch.name;
    if (typeof patch.description === "string" || patch.description === null) updateRow.description = patch.description;
    if (patch.state != null) updateRow.state_json = patch.state;
    if (typeof patch.isDefault === "boolean") updateRow.is_default = !!patch.isDefault;

    if (updateRow.is_default === true) {
      await sb
        .from("user_saved_views")
        .update({ is_default: false })
        .eq("owner_auth_id", userId)
        .eq("table_id", (existing as any).table_id)
        .neq("id", id);
    }

    const { error: updErr } = await sb
      .from("user_saved_views")
      .update(updateRow)
      .eq("owner_auth_id", userId)
      .eq("id", id);
    if (updErr) throw updErr;

    return json({ success: true });
  } catch (err: any) {
    return json({ error: { message: String(err?.message ?? err ?? "") } }, 500);
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx.params?.id;
    if (!id) return json({ error: { message: "Missing id" } }, 400);

    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    const userId = (auth as any)?.user?.id as string | undefined;
    if (!userId) return json({ error: { message: "Unauthenticated" } }, 401);

    const { error } = await sb
      .from("user_saved_views")
      .delete()
      .eq("owner_auth_id", userId)
      .eq("id", id);
    if (error) throw error;

    return json({ success: true });
  } catch (err: any) {
    return json({ error: { message: String(err?.message ?? err ?? "") } }, 500);
  }
}

export const dynamic = "force-dynamic";
