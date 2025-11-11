// src/app/api/stock-adjustments/[id]/locations/route.ts
import { NextResponse } from "next/server";

import { awaitParams, type AwaitableParams } from "@/lib/next/server-helpers";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

export async function GET(req: Request, ctx: AwaitableParams<{ id: string }>) {
  const { id } = await awaitParams(ctx);
  if (!id || typeof id !== "string" || id.length > 128) {
    return json({ error: { message: "Invalid id parameter" } }, 400);
  }

  const sb = await createSupabaseServerClient();

  // First, verify the entry exists and get its anchor (tally_card_number)
  // Get the entry and check if it's the latest version (current)
  const { data: entryById, error: entryByIdError } = await sb
    .from("tcm_user_tally_card_entries")
    .select("tally_card_number, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (entryByIdError) {
    return json({ error: { message: entryByIdError.message } }, 400);
  }

  if (!entryById) {
    return json({ error: { message: "Entry not found" } }, 404);
  }

  // Check if this entry is the latest version (current) for its tally_card_number
  const { data: latestEntry, error: latestError } = await sb
    .from("tcm_user_tally_card_entries")
    .select("id, multi_location")
    .eq("tally_card_number", entryById.tally_card_number)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (latestError) {
    return json({ error: { message: latestError.message } }, 400);
  }

  // Verify the requested entry is the current one
  if (latestEntry.id !== id) {
    return json({ error: { message: "Entry is not the current version" } }, 400);
  }

  const entry = { ...latestEntry, tally_card_number: entryById.tally_card_number };

  // If not multi-location, return empty array
  if (!entry.multi_location) {
    return json({ locations: [] }, 200);
  }

  // Get all entry IDs for this tally_card_number
  const { data: entryIds } = await sb
    .from("tcm_user_tally_card_entries")
    .select("id")
    .eq("tally_card_number", entry.tally_card_number);

  const entryIdList = entryIds?.map((e) => e.id) ?? [];

  if (entryIdList.length === 0) {
    return json({ locations: [] }, 200);
  }

  // Fetch child locations for the current entry only
  const { data: locations, error: locationsError } = await sb
    .from("tcm_user_tally_card_entry_locations")
    .select("id, location, qty, pos")
    .eq("entry_id", id)
    .order("pos", { ascending: true, nullsFirst: false });

  if (locationsError) {
    return json({ error: { message: locationsError.message } }, 400);
  }

  return json({ locations: locations ?? [] }, 200);
}

type LocationInput = {
  location: string;
  qty: number;
  pos?: number | null;
};

export async function PUT(req: Request, ctx: AwaitableParams<{ id: string }>) {
  const { id } = await awaitParams(ctx);

  if (!id || typeof id !== "string" || id.length > 128) {
    return json({ error: { message: "Invalid id parameter" } }, 400);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const locations: LocationInput[] = Array.isArray(body?.locations) ? body.locations : [];
  const previousEntryId = typeof body?.previousEntryId === "string" ? body.previousEntryId : undefined;

  const normalizedLocations = locations
    .map((loc, index): LocationInput | null => {
      if (!loc || typeof loc.location !== "string") {
        return null;
      }
      const trimmed = loc.location.trim();
      if (!trimmed) {
        return null;
      }
      const qtyNumber = typeof loc.qty === "number" ? loc.qty : Number(loc.qty);
      const posNumber =
        loc.pos === null || loc.pos === undefined
          ? index + 1
          : typeof loc.pos === "number"
            ? loc.pos
            : Number(loc.pos);

      return {
        location: trimmed,
        qty: Number.isFinite(qtyNumber) ? qtyNumber : 0,
        pos: Number.isFinite(posNumber) ? posNumber : index + 1,
      };
    })
    .filter((loc): loc is LocationInput => !!loc);

  const sb = await createSupabaseServerClient();

  // Validate entry exists (and user has access via RLS)
  const { data: entry, error: entryError } = await sb
    .from("tcm_user_tally_card_entries")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (entryError) {
    return json({ error: { message: entryError.message } }, 400);
  }

  if (!entry) {
    return json({ error: { message: "Entry not found" } }, 404);
  }

  const deleteEntryIds = [id];
  if (previousEntryId && previousEntryId !== id) {
    deleteEntryIds.push(previousEntryId);
  }

  // Delete existing locations for relevant entry IDs
  const { error: deleteError } = await sb
    .from("tcm_user_tally_card_entry_locations")
    .delete()
    .in("entry_id", deleteEntryIds);

  if (deleteError) {
    return json({ error: { message: deleteError.message } }, 400);
  }

  if (normalizedLocations.length === 0) {
    return json({ locations: [] }, 200);
  }

  const insertPayload = normalizedLocations.map((loc) => ({
    entry_id: id,
    location: loc.location,
    qty: loc.qty,
    pos: loc.pos ?? null,
  }));

  const { data: inserted, error: insertError } = await sb
    .from("tcm_user_tally_card_entry_locations")
    .insert(insertPayload)
    .select("id, entry_id, location, qty, pos")
    .order("pos", { ascending: true });

  if (insertError) {
    return json({ error: { message: insertError.message } }, 400);
  }

  return json({ locations: inserted ?? [] }, 200);
}

