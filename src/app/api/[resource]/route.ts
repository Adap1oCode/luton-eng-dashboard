// src/app/api/[resource]/route.ts
// Collection route: LIST (GET) and CREATE (POST)

import { NextRequest, NextResponse } from "next/server";

import { listHandler } from "@/lib/api/handle-list";
import { resolveResource } from "@/lib/api/resolve-resource";
import { awaitParams, type AwaitableParams } from "@/lib/next/server-helpers";
import { withLogging } from "@/lib/obs/with-logging";
import { createSupabaseServerProvider } from "@/lib/supabase/factory";

export const dynamic = "force-dynamic";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

// GET /api/[resource] → { rows, total, ... }
export async function GET(req: Request, ctx: AwaitableParams<{ resource: string }>) {
  const { resource } = await awaitParams(ctx);
  return listHandler(req, resource);
}

// POST /api/[resource] → { row } (created)
export const POST = withLogging(async (req: NextRequest, ctx: AwaitableParams<{ resource: string }>) => {
  const { resource } = await awaitParams(ctx);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  try {
    const entry = await resolveResource(resource);
    const provider = createSupabaseServerProvider(entry.config as any);

    // Create returns the new id
    const id = await provider.create(payload);

    // Fetch the created record so we return a consistent envelope
    const row = await provider.get(id);
    if (!row) {
      // Created but not visible (e.g., scoping)? Return id as fallback.
      return json({ id }, 201);
    }

    return json({ row }, 201);
  } catch (err: any) {
    const msg = String(err?.message ?? err ?? "");
    if (/unknown resource|invalid resource|no config|not found/i.test(msg)) {
      return json({ error: { message: "Unknown resource" }, resource }, 404);
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
