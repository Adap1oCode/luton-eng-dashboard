import { NextResponse } from "next/server";

import { resolveResource } from "@/lib/api/resolve-resource";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

export async function DELETE(req: Request, { params }: { params: { resource: string } }) {
  const { resource } = params;

  if (!resource || typeof resource !== "string" || resource.length > 64) {
    return json({ error: { message: "Invalid resource parameter" } }, 400);
  }

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ error: { message: "No IDs provided for deletion" } }, 400);
    }

    const entry = await resolveResource(resource);
    const cfg = entry.config as any;
    const supabase = await createSupabaseServerClient();

    // Soft delete path if activeFlag is configured
    if (cfg.activeFlag) {
      const updateData: any = { [cfg.activeFlag]: false };
      if (cfg.schema?.fields?.updated_at) {
        updateData.updated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from(cfg.table)
        .update(updateData)
        .in(cfg.pk, ids)
        .select(`${cfg.pk}, ${cfg.activeFlag}`);

      if (error) {
        const msg = String(error.message || "");
        if (/permission|rls|policy/i.test(msg)) {
          return json({ error: { message: msg } }, 403);
        }
        return json({ error: { message: msg } }, 400);
      }

      return json({
        success: true,
        message: `Successfully soft-deleted ${data?.length || 0} records`,
        deletedIds: ids,
        softDelete: true,
      });
    }

    // Hard delete fallback
    const { data, error } = await supabase.from(cfg.table).delete().in(cfg.pk, ids).select(cfg.pk);

    if (error) {
      const msg = String(error.message || "");
      if (/permission|rls|policy/i.test(msg)) {
        return json({ error: { message: msg } }, 403);
      }
      return json({ error: { message: msg } }, 400);
    }

    return json({
      success: true,
      message: `Successfully deleted ${data?.length || 0} records`,
      deletedIds: ids,
      softDelete: false,
    });
  } catch (err: any) {
    const msg = String(err?.message ?? err ?? "");
    if (/unknown resource|invalid resource|no config|not found/i.test(msg)) {
      return json({ error: { message: "Unknown resource" }, resource }, 404);
    }
    console.error("[bulk delete]", resource, err);
    return json({ error: { message: "Internal server error" } }, 500);
  }
}
