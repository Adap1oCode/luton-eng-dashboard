// src/lib/api/handle-item.ts
import { NextResponse } from "next/server";
import { resolveResource } from "@/lib/api/resolve-resource";
import { createSupabaseServerProvider } from "@/lib/supabase/factory";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit =
    typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

// Same philosophy as handle-list.ts: unknown resources -> 404; other errors -> 500
function mapError(resourceKey: string, err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  if (
    (err as any)?.code === "RESOURCE_NOT_FOUND" ||
    /unknown resource|invalid resource|no config|not found/i.test(msg)
  ) {
    return json({ error: { message: "Unknown resource" }, resource: resourceKey }, 404);
  }
  return json(
    {
      error: {
        message:
          (err as any)?.message ??
          (typeof err === "string" ? err : "Internal server error"),
      },
      resource: resourceKey,
    },
    500
  );
}

function validateParams(resource: unknown, id: unknown) {
  if (!resource || typeof resource !== "string" || resource.length > 64) {
    return json({ error: { message: "Invalid resource parameter" } }, 400);
  }
  if (!id || typeof id !== "string" || id.length > 128) {
    return json({ error: { message: "Invalid id parameter" } }, 400);
  }
  return null;
}

function maybeApplyAppTimestamps(
  row: Record<string, any>,
  select: string | undefined
) {
  const s = String(select || "");
  const hasUpdated = /\bupdated_at\b/.test(s);
  if (hasUpdated) row.updated_at = new Date().toISOString();
}

/** GET one */
export async function getOneHandler(
  _req: Request,
  resourceKey: string,
  id: string
) {
  const invalid = validateParams(resourceKey, id);
  if (invalid) return invalid;

  try {
    const entry = await resolveResource(resourceKey);
    const provider = createSupabaseServerProvider(entry.config as any);

    const row = await provider.get(id);
    if (!row) {
      return json({ error: { message: "Not found" } }, 404);
    }

    return json({ row }, 200);
  } catch (err) {
    console.error("[getOneHandler]", resourceKey, id, err);
    return mapError(resourceKey, err);
  }
}

/** PATCH (update) */
export async function updateHandler(
  req: Request,
  resourceKey: string,
  id: string
) {
  const invalid = validateParams(resourceKey, id);
  if (invalid) return invalid;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  try {
    const entry = await resolveResource(resourceKey);
    const provider = createSupabaseServerProvider(entry.config as any);

    // Apply updated_at if it exists in projection (app-level guard; DB triggers preferred)
    const patch =
      typeof (entry.config as any).fromInput === "function"
        ? (entry.config as any).fromInput(payload)
        : payload;

    maybeApplyAppTimestamps(patch, (entry.config as any).select);

    await provider.update(id, patch);

    // Return the fresh row (envelope)
    const fresh = await provider.get(id);
    if (!fresh) {
      // Updated but now filtered by scoping? Treat as not found.
      return json({ error: { message: "Not found" } }, 404);
    }
    return json({ row: fresh }, 200);
  } catch (err) {
    // Surface RLS/policy as 403 where detectable; else 400/500
    const msg = String((err as any)?.message ?? "");
    if (/permission|rls|policy/i.test(msg)) {
      return json({ error: { message: msg } }, 403);
    }
    // Supabase client errors often deserve 400
    if (/invalid|bad request|payload|column|type/i.test(msg)) {
      return json({ error: { message: msg } }, 400);
    }
    console.error("[updateHandler]", resourceKey, id, err);
    return mapError(resourceKey, err);
  }
}

/** DELETE (soft or hard) */
export async function deleteHandler(
  _req: Request,
  resourceKey: string,
  id: string
) {
  const invalid = validateParams(resourceKey, id);
  if (invalid) return invalid;

  try {
    const entry = await resolveResource(resourceKey);
    const cfg = entry.config as any;

    // Soft delete path if activeFlag is configured
    if (cfg.activeFlag) {
      const supabase = await createSupabaseServerClient();

      const updateData: any = { [cfg.activeFlag]: false };
      if (cfg.schema?.fields?.updated_at) {
        updateData.updated_at = new Date().toISOString();
      }

      const { data, error } = await (supabase as any)
        .from(cfg.table)
        .update(updateData)
        .eq(cfg.pk, id)
        .select(cfg.select || "*")
        .single();

      if (error) {
        const msg = String(error.message || "");
        if (/permission|rls|policy/i.test(msg)) {
          return json({ error: { message: msg } }, 403);
        }
        return json({ error: { message: msg } }, 400);
      }

      // Keep envelope on soft delete
      const domain = typeof cfg.toDomain === "function" ? cfg.toDomain(data) : data;
      return json({ row: domain }, 200);
    }

    // Hard delete fallback via provider
    const provider = createSupabaseServerProvider(cfg);
    await provider.remove(id);
    return json({ success: true }, 200);
  } catch (err) {
    console.error("[deleteHandler]", resourceKey, id, err);
    return mapError(resourceKey, err);
  }
}
