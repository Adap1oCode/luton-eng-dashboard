import { NextResponse } from "next/server";

// Option A: import the feature-specific resource config directly
import { tcmTallyCardsConfig } from "@/app/(main)/forms/tally_cards/_data/config";

// Option B (if you keep a central registry): import from your resources index
// import { tcmTallyCardsConfig } from "@/lib/data/resources";

import { createSupabaseServerProvider } from "@/lib/supabase/factory";
import { toRow } from "@/app/(main)/forms/tally_cards/projection";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 50);
  const activeOnly = url.searchParams.get("activeOnly") === "true";

  const provider = createSupabaseServerProvider(tcmTallyCardsConfig);
  const { rows, total } = await provider.list({ q, page, pageSize, activeOnly });

  // map domain -> UI row
  const viewRows = rows.map(toRow);

  return NextResponse.json({ rows: viewRows, total, page, pageSize });
}
