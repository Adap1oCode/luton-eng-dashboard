// src/app/api/forms/stock-adjustments/route.ts
// Custom handler for stock-adjustments that handles parent entry + child locations

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

// POST /api/forms/stock-adjustments → { row } (created)
export const POST = withLogging(async (req: NextRequest, ctx: AwaitableParams<{ resource?: string }>) => {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  try {
    const entry = await resolveResource("tcm_user_tally_card_entries");
    const provider = createSupabaseServerProvider(entry.config as any);
    const sb = await createSupabaseServerClient();

    // Extract child locations if multi_location is true
    const locations = payload.multi_location ? payload.locations ?? [] : [];
    const { locations: _locations, ...parentPayload } = payload;

    // Create parent entry
    const entryId = await provider.create(parentPayload);

    // If multi_location is true, create child location rows
    if (payload.multi_location && locations.length > 0) {
      const locationRows = locations.map((loc: any, idx: number) => ({
        entry_id: entryId,
        location: loc.location,
        qty: loc.qty,
        pos: loc.pos ?? idx + 1,
      }));

      const { error: locationsError } = await sb
        .from("tcm_user_tally_card_entry_locations")
        .insert(locationRows);

      if (locationsError) {
        // Rollback: delete the parent entry if child insert fails
        await sb.from("tcm_user_tally_card_entries").delete().eq("id", entryId);
        return json({ error: { message: `Failed to create child locations: ${locationsError.message}` } }, 400);
      }
    }

    // Fetch the created record so we return a consistent envelope
    const row = await provider.get(entryId);
    if (!row) {
      // Created but not visible (e.g., scoping)? Return id as fallback.
      return json({ id: entryId }, 201);
    }

    return json({ row }, 201);
  } catch (err: any) {
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
    // Let withLogging handle the error logging and 500 response
    throw err;
  }
});

