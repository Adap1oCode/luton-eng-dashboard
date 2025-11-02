// src/app/api/saved-views/route.ts
// GET: list views by tableId for current user
// POST: create a new view for current user

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type SavedViewPayload = {
  tableId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  state: any; // JSON serializable
};

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tableId = (url.searchParams.get("tableId") ?? "").trim();
    if (!tableId) return json({ error: { message: "Missing tableId" } }, 400);

    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    const userId = (auth as any)?.user?.id as string | undefined;
    if (!userId) return json({ error: { message: "Unauthenticated" } }, 401);

    const { data, error } = await sb
      .from("user_saved_views")
      .select("id, table_id, name, description, is_default, state_json, created_at, updated_at")
      .eq("owner_auth_id", userId)
      .eq("table_id", tableId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;

    const views = (data ?? []).map((v: any) => ({
      id: v.id as string,
      tableId: v.table_id as string,
      name: v.name as string,
      description: (v.description as string | null) ?? "",
      isDefault: !!v.is_default,
      state: v.state_json,
      createdAt: v.created_at as string,
      updatedAt: v.updated_at as string,
    }));

    return json({ views });
  } catch (err: any) {
    return json({ error: { message: String(err?.message ?? err ?? "") } }, 500);
  }
}

export async function POST(req: Request) {
  try {
    let payload: SavedViewPayload | null = null;
    try {
      payload = (await req.json()) as SavedViewPayload;
    } catch {
      return json({ error: { message: "Invalid JSON body" } }, 400);
    }
    if (!payload?.tableId || !payload?.name || !payload?.state) {
      return json({ error: { message: "Missing required fields" } }, 400);
    }

    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    const userId = (auth as any)?.user?.id as string | undefined;
    if (!userId) return json({ error: { message: "Unauthenticated" } }, 401);

    const insertRow: any = {
      table_id: payload.tableId,
      name: payload.name,
      description: payload.description ?? null,
      is_default: !!payload.isDefault,
      owner_auth_id: userId,
      state_json: payload.state,
    };

    if (insertRow.is_default) {
      await sb
        .from("user_saved_views")
        .update({ is_default: false })
        .eq("owner_auth_id", userId)
        .eq("table_id", payload.tableId);
    }

    const { data, error } = await sb
      .from("user_saved_views")
      .insert(insertRow)
      .select("id")
      .single();
    if (error) throw error;

    return json({ id: (data as any).id }, 201);
  } catch (err: any) {
    return json({ error: { message: String(err?.message ?? err ?? "") } }, 500);
  }
}

export const dynamic = "force-dynamic";
