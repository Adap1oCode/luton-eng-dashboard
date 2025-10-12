// src/app/api/[resource]/[id]/route.ts
// Generic single-record route: GET / PATCH / DELETE
// Mirrors the list/create pattern from src/app/api/[resource]/route.ts

import { NextResponse } from "next/server";
import { resolveResource } from "@/lib/api/resolve-resource";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Shared guard for resource and id params
function validateParams(resource: unknown, id: unknown) {
  if (!resource || typeof resource !== "string" || resource.length > 64) {
    return NextResponse.json(
      { error: { message: "Invalid resource parameter" } },
      { status: 400 }
    );
  }
  if (!id || typeof id !== "string" || id.length > 128) {
    return NextResponse.json(
      { error: { message: "Invalid id parameter" } },
      { status: 400 }
    );
  }
  return null;
}

// Conditionally set timestamps if projection suggests they exist
function maybeApplyAppTimestamps(
  row: Record<string, any>,
  select: string | undefined
) {
  const s = String(select || "");
  const hasUpdated = /\bupdated_at\b/.test(s);
  if (hasUpdated) row.updated_at = new Date().toISOString();
}

/**
 * GET /api/[resource]/[id]
 * Fetch a single record by primary key.
 */
export async function GET(
  req: Request,
  ctx: { params: { resource: string; id: string } }
) {
  const invalid = validateParams(ctx?.params?.resource, ctx?.params?.id);
  if (invalid) return invalid;

  const resource = ctx.params.resource;
  const id = ctx.params.id;

  let config: any;
  try {
    const resolved = await resolveResource(resource);
    config = resolved?.config ?? resolved;
    if (!config?.table || !config?.pk)
      throw new Error("Invalid resource config");
  } catch {
    return NextResponse.json(
      { error: { message: "Unknown resource" }, resource },
      { status: 404 }
    );
  }

  const supabase = await createSupabaseServerClient();

const { data, error } = await (supabase as any)
  .from(config.table)
  .select(config.select || "*")
  .eq(config.pk, id)
  .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: { message: "Not found" } },
      { status: 404 }
    );
  }

  const domain =
    typeof config.toDomain === "function" ? config.toDomain(data) : data;

  return NextResponse.json({ row: domain }, { status: 200 });
}

/**
 * PATCH /api/[resource]/[id]
 * Update a record by primary key.
 */
export async function PATCH(
  req: Request,
  ctx: { params: { resource: string; id: string } }
) {
  const invalid = validateParams(ctx?.params?.resource, ctx?.params?.id);
  if (invalid) return invalid;

  const resource = ctx.params.resource;
  const id = ctx.params.id;

  let config: any;
  try {
    const resolved = await resolveResource(resource);
    config = resolved?.config ?? resolved;
    if (!config?.table || !config?.pk)
      throw new Error("Invalid resource config");
  } catch {
    return NextResponse.json(
      { error: { message: "Unknown resource" }, resource },
      { status: 404 }
    );
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  // Normalize via config.fromInput if available
  const rowToUpdate =
    typeof config.fromInput === "function" ? config.fromInput(payload) : payload;

  // Apply updated_at if relevant
  maybeApplyAppTimestamps(rowToUpdate, config.select);

  const supabase = await createSupabaseServerClient();

  // Cast supabase to any to avoid "Type instantiation is excessively deep" error
const { data, error } = await (supabase as any)
  .from(config.table)
  .update(rowToUpdate)
  .eq(config.pk, id)
  .select(config.select || "*")
  .single();

  if (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 }
    );
  }

  const domain =
    typeof config.toDomain === "function" ? config.toDomain(data) : data;

  return NextResponse.json({ row: domain }, { status: 200 });
}

/**
 * DELETE /api/[resource]/[id]
 * Hard delete by default; soft delete if config.activeFlag exists.
 */
export async function DELETE(
  req: Request,
  ctx: { params: { resource: string; id: string } }
) {
  const invalid = validateParams(ctx?.params?.resource, ctx?.params?.id);
  if (invalid) return invalid;

  const resource = ctx.params.resource;
  const id = ctx.params.id;

  let config: any;
  try {
    const resolved = await resolveResource(resource);
    config = resolved?.config ?? resolved;
    if (!config?.table || !config?.pk)
      throw new Error("Invalid resource config");
  } catch {
    return NextResponse.json(
      { error: { message: "Unknown resource" }, resource },
      { status: 404 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Soft delete if activeFlag is defined
  if (config.activeFlag) {
const { data, error } = await (supabase as any)
  .from(config.table)
  .update({
    [config.activeFlag]: false,
    updated_at: new Date().toISOString(),
  })
  .eq(config.pk, id)
  .select(config.select || "*")
  .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    const domain =
      typeof config.toDomain === "function" ? config.toDomain(data) : data;
    return NextResponse.json({ row: domain }, { status: 200 });
  }

  // Hard delete fallback
const { error } = await (supabase as any)
  .from(config.table)
  .delete()
  .eq(config.pk, id);
  if (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
