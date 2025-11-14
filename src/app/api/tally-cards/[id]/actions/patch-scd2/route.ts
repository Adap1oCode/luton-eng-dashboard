// src/app/api/tally-cards/[id]/actions/patch-scd2/route.ts
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

  // Filter out fields that shouldn't be sent to tally-cards updates
  // - locations: Only used for stock-adjustments (tcm_user_tally_card_entries), not tally-cards
  // - warehouse: Removed column, only use warehouse_id
  const { locations, warehouse, ...filteredPayload } = payload;

  const sb = await createSupabaseServerClient();

  // Extract only the fields we need for tally cards
  // The RPC function handles SCD-2 logic internally
  // Feature flag: Use v3 (production-ready) by default, fallback to v1 if flag is off
  const useV3 = process.env.NEXT_PUBLIC_SCD2_USE_V3 !== "false"; // Default to true
  const rpcFunctionName = useV3 
    ? "fn_tcm_tally_cards_patch_scd2_v3"
    : "fn_tally_card_patch_scd2";
  
  const { data, error } = await (sb as any).rpc(rpcFunctionName, {
    p_id: id,
    p_tally_card_number: filteredPayload?.tally_card_number ?? null,
    p_warehouse_id: filteredPayload?.warehouse_id ?? null,
    p_item_number: filteredPayload?.item_number !== null && filteredPayload?.item_number !== undefined ? Number(filteredPayload.item_number) : null,
    p_note: filteredPayload?.note ?? null,
    p_is_active: filteredPayload?.is_active ?? null,
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
