// -----------------------------------------------------------------------------
// FILE: src/app/api/tools/resource/[key]/route.ts
// TYPE: Next.js App Router API (GET)
// PURPOSE: Return resource metadata (table/view, fields) for generator UI
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import resources from "@/lib/data/resources";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { key: string } }) {
  const key = ctx?.params?.key;
  const cfg = (resources as any)?.[key];
  if (!cfg) {
    return NextResponse.json(
      { error: `Unknown resource: ${key}` },
      { status: 404 },
    );
  }

  const fields = Object.entries(cfg?.schema?.fields ?? {}).map(([name, meta]: any) => ({
    name,
    type: meta?.type ?? "unknown",
    readonly: !!meta?.readonly,
    write: !!meta?.write,
    nullable: !!meta?.nullable,
  }));

  return NextResponse.json({
    key,
    table: cfg.table,
    pk: cfg.pk,
    select: cfg.select ?? null,
    search: cfg.search ?? [],
    defaultSort: cfg.defaultSort ?? null,
    warehouseScope: cfg.warehouseScope ?? null,
    ownershipScope: cfg.ownershipScope ?? null,
    fields,
  });
}


