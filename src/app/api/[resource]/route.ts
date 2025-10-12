// src/app/api/[resource]/route.ts
// Minimal delegator: build once → route is a thin passthrough.

import { NextResponse } from "next/server";
import { listHandler } from "@/lib/api/handle-list";
import { resolveResource } from "@/lib/api/resolve-resource";
// SSR helper exported as createClient from supabase-server.ts
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** Local, generic view of what we need from a resource config */
type ResourceShape = {
  table: string;
  pk?: string;
  select?: string;
  fromInput?: (x: any) => any;
  toDomain?: (x: any) => any;
};

/** Accept both return shapes: plain config or { config } */
function unwrapConfig(resolved: any): ResourceShape {
  const cfg = (resolved?.config ?? resolved) as Partial<ResourceShape>;
  if (!cfg || typeof cfg !== "object" || !cfg.table) {
    throw Object.assign(new Error("Invalid resource config"), {
      code: "INVALID_RESOURCE_CONFIG",
    });
  }
  return cfg as ResourceShape;
}

/** Shared guard for resource param. */
function validateResourceParam(resource: unknown) {
  if (!resource || typeof resource !== "string" || resource.length > 64) {
    return NextResponse.json(
      { error: { message: "Invalid resource parameter" } },
      { status: 400 }
    );
  }
  return null;
}

/** Conditionally set timestamps only if projection suggests they exist. */
function maybeApplyAppTimestamps(
  row: Record<string, any>,
  select: string | undefined
) {
  const s = String(select || "");
  const hasCreated = /\bcreated_at\b/.test(s);
  const hasUpdated = /\bupdated_at\b/.test(s);
  const now = new Date().toISOString();

  if (hasCreated && row.created_at === undefined) row.created_at = now;
  if (hasUpdated) row.updated_at = now;
}

export async function GET(req: Request, ctx: { params: { resource: string } }) {
  const invalid = validateResourceParam(ctx?.params?.resource);
  if (invalid) return invalid;

  const resource = ctx.params.resource;

  // Preflight: verify the resource is known → 404 if not
  try {
    await resolveResource(resource);
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    if (
      err?.code === "RESOURCE_NOT_FOUND" ||
      /unknown resource|invalid resource|not found|no config/i.test(msg)
    ) {
      return NextResponse.json(
        { error: { message: "Unknown resource" }, resource },
        { status: 404 }
      );
    }
    // For other errors, let listHandler handle/mask consistently
  }

  // Delegate to the shared list handler (it already maps errors -> JSON)
  return listHandler(req, resource);
}

/**
 * Create: POST /api/[resource]
 * - Uses ResourceConfig.fromInput (if present) for normalization
 * - Conditionally sets created_at / updated_at when those fields are part of select
 * - Returns { row } with the domain-mapped record
 *
 * TESTS TO UPDATE (minimal):
 *  - src/app/api/[resource]/route.spec.ts:
 *      • POST happy-path (201, { row })
 *      • POST invalid JSON (400)
 *      • POST unknown resource (404)
 *      • (optional) POST DB error (400)
 */
export async function POST(req: Request, ctx: { params: { resource: string } }) {
  const invalid = validateResourceParam(ctx?.params?.resource);
  if (invalid) return invalid;

  const resource = ctx.params.resource;

  // Resolve the resource config; if unknown → 404
  let config: ResourceShape;
  try {
    const resolved = await resolveResource(resource);
    config = unwrapConfig(resolved);
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    if (
      err?.code === "RESOURCE_NOT_FOUND" ||
      /unknown resource|invalid resource|not found|no config/i.test(msg)
    ) {
      return NextResponse.json(
        { error: { message: "Unknown resource" }, resource },
        { status: 404 }
      );
    }
    // Any other failure here is an internal config error
    return NextResponse.json(
      { error: { message: "Failed to resolve resource config" } },
      { status: 500 }
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

  // Normalize input via resource config (if provided)
  const rowToInsert =
    typeof config.fromInput === "function" ? config.fromInput(payload) : payload;

  // Apply app-managed timestamps if the select suggests these columns exist
  maybeApplyAppTimestamps(rowToInsert, config.select);

  // ✅ Await the SSR client factory
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from(config.table)
    .insert(rowToInsert)
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

  return NextResponse.json({ row: domain }, { status: 201 });
}
