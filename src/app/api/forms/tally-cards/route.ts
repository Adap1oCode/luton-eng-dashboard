// src/app/api/forms/tally-cards/route.ts
// Handler for tally-cards form submissions

import { NextRequest, NextResponse } from "next/server";

import { resolveResource } from "@/lib/api/resolve-resource";
import { createSupabaseServerProvider } from "@/lib/supabase/factory";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { awaitParams, type AwaitableParams } from "@/lib/next/server-helpers";
import { withLogging } from "@/lib/obs/with-logging";

export const dynamic = "force-dynamic";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

// POST /api/forms/tally-cards → { row } (created)
export const POST = withLogging(async (req: NextRequest, ctx: AwaitableParams<{ resource?: string }>) => {
  console.log("[tally-cards POST] Route handler called");
  let payload: any;
  try {
    payload = await req.json();
    console.log("[tally-cards POST] Payload parsed successfully");
  } catch (parseError: any) {
    console.error("[tally-cards POST] JSON parse error:", parseError);
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  try {
    const resource = await resolveResource("tcm_tally_cards");
    const provider = createSupabaseServerProvider(resource.config as any);

    // Only use warehouse_id - do not pass warehouse name or code
    // Remove warehouse if it's present (should only use warehouse_id)
    if (payload.warehouse) {
      delete payload.warehouse;
    }

    // Validate that warehouse_id is provided
    if (!payload.warehouse_id) {
      return json({ error: { message: "warehouse_id is required" } }, 400);
    }

    console.log("[tally-cards POST] Final payload:", JSON.stringify(payload, null, 2));

    // Create returns the new id
    const id = await provider.create(payload);

    // Fetch the created record so we return a consistent envelope
    const row = await provider.get(id);
    if (!row) {
      // Created but not visible (e.g., scoping)? Return id as fallback.
      return json({ id }, 201);
    }

    // Return both id and row for compatibility with different redirect handlers
    return json({ id: (row as any).id ?? id, row }, 201);
  } catch (err: any) {
    // Log the full error for debugging
    console.error("[tally-cards POST] Error caught:", err);
    console.error("[tally-cards POST] Error message:", err?.message);
    console.error("[tally-cards POST] Error stack:", err?.stack);
    console.error("[tally-cards POST] Payload received:", JSON.stringify(payload, null, 2));
    
    const msg = String(err?.message ?? err ?? "");
    if (/unknown resource|invalid resource|no config|not found/i.test(msg)) {
      return json({ error: { message: "Unknown resource" } }, 404);
    }
    // RLS/policy/permission
    if (/permission|rls|policy/i.test(msg)) {
      return json({ error: { message: msg } }, 403);
    }
    // Validation-ish client errors
    if (/invalid|bad request|payload|column|type/i.test(msg)) {
      return json({ error: { message: msg } }, 400);
    }
    // Duplicate key errors (unique constraint violations)
    if (/duplicate key|unique constraint/i.test(msg)) {
      return json({ error: { message: msg } }, 409); // 409 Conflict
    }
    // Let withLogging handle the error logging and 500 response
    throw err;
  }
});

