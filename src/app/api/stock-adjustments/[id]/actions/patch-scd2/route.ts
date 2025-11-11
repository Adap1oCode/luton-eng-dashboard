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

/**
 * Simplified patch handler that delegates all SCD2 logic to the database RPC function.
 * The RPC function now handles:
 * - Detecting changes (including reason_code, multi_location)
 * - Creating new SCD2 rows only when needed
 * - Setting hashdiff via trigger
 * - Respecting the no-op trigger
 * 
 * Note: Child locations are managed separately via the resource API (/api/tcm_user_tally_card_entry_locations)
 * and aggregated into parent fields (qty, location) after locations are updated.
 */
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

  // Call RPC function with parent fields only
  // Child locations are managed separately via resource API
  // Feature flag: Use v3 (production-ready) by default, fallback to v2 if flag is off
  const useV3 = process.env.NEXT_PUBLIC_SCD2_USE_V3 !== "false"; // Default to true
  const rpcFunctionName = useV3 
    ? "fn_tcm_user_tally_card_entries_patch_scd2_v3"
    : "fn_user_entry_patch_scd2_v2";
  
  console.log(`[patch-scd2] Calling RPC function ${rpcFunctionName} (v3=${useV3})...`);
  let data, error;
  try {
    const rpcParams = {
      p_id: id,
      p_reason_code: payload.reason_code ?? null,
      p_multi_location: payload.multi_location ?? null,
      p_qty: payload.qty ?? null,
      p_location: payload.location ?? null,
      p_note: payload.note ?? null,
    };
    console.log("[patch-scd2] RPC parameters:", rpcParams);
    
    const result = await (sb as any).rpc(rpcFunctionName, rpcParams);
    data = result.data;
    error = result.error;
    
    console.log("[patch-scd2] RPC response:", {
      has_data: !!data,
      data_id: data?.id,
      data_multi_location: data?.multi_location,
      has_error: !!error,
      error_message: error?.message,
    });
  } catch (rpcErr: any) {
    console.error("[patch-scd2] RPC call failed:", rpcErr);
    const errorMessage = rpcErr?.message || String(rpcErr) || "Unknown RPC error";
    const status = /permission|rls|policy/i.test(errorMessage) ? 403 : 500;
    return json({ error: { message: `RPC call failed: ${errorMessage}` } }, status);
  }

  if (error) {
    console.error("[patch-scd2] RPC returned error:", error);
    const status = /permission|rls|policy/i.test(error.message) ? 403 : 400;
    return json({ error: { message: error.message } }, status);
  }

  // RPC function returns a single row (not an array) when a new SCD2 record is created
  // If no changes were detected, it returns the existing current record
  // If NULL/empty, it means no change was detected (but this shouldn't happen with our updated function)
  if (!data) {
    // No change detected - fetch current record to return
    // Get the latest version for this entry's tally_card_number
    const { data: entryData } = await sb
      .from("tcm_user_tally_card_entries")
      .select("tally_card_number")
      .eq("id", id)
      .single();

    if (!entryData) {
      return json({ error: { message: "Entry not found" } }, 404);
    }

    const { data: currentRow, error: fetchError } = await sb
      .from("tcm_user_tally_card_entries")
      .select("*")
      .eq("tally_card_number", entryData.tally_card_number)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      return json({ error: { message: fetchError.message } }, 400);
    }

    // Return 204 No Content if truly no changes, or 200 with current row
    return json({ row: currentRow }, 200);
  }

  // RPC returned the new/updated record
  // Fetch from view to get enriched data (warehouse, user name, etc.)
  const { data: enrichedRow, error: fetchError } = await sb
    .from("v_tcm_user_tally_card_entries")
    .select("*")
    .eq("id", data.id)
    .single();

  if (fetchError) {
    console.error("[patch-scd2] Failed to fetch from view:", fetchError);
    // Fallback to the raw data if view fetch fails
    return json({ row: data }, 200);
  }

  if (enrichedRow?.multi_location) {
    const { data: editPayload, error: editPayloadError } = await (sb as any).rpc(
      "fn_stock_adjustment_load_edit",
      { p_id: data.id },
    );

    if (!editPayloadError && editPayload && Array.isArray(editPayload)) {
      const payloadRow = editPayload[0];
      if (payloadRow?.locations && Array.isArray(payloadRow.locations)) {
        (enrichedRow as any).child_locations = payloadRow.locations;
        console.log("[patch-scd2] Added child locations from helper RPC");
      }
    } else if (editPayloadError) {
      console.error("[patch-scd2] Failed to load child locations via helper RPC:", editPayloadError);
    }
  }

  return json({ row: enrichedRow }, 200);
}
