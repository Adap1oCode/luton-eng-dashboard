// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// TYPE: Server Component
// PURPOSE: SSR page for "View All Tally Cards" using shared Shell + ResourceTableClient
// NOTES:
//  • Compatible with Next 15 async searchParams
//  • Fetches from /api/tcm_tally_cards_current with no-store
//  • Forwards cookies to preserve Supabase session (RLS)
//  • Parses page/pageSize defensively (handles string | string[] | undefined)
// -----------------------------------------------------------------------------

import { headers, cookies } from "next/headers";

import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import PageShell from "@/components/forms/shell/page-shell";
import type { TallyCardRow } from "@/lib/data/resources/tally_cards/types";

import { tallyCardsToolbar, tallyCardsChips, tallyCardsActions } from "./toolbar.config";
import { tallyCardsViewConfig } from "./view.config";

type SPValue = string | string[] | undefined;
type SPRecord = Record<string, SPValue>;
type PageProps = {
  // Next 15: searchParams may be a Promise in server components
  searchParams?: Promise<SPRecord> | SPRecord;
};

// -- helpers -------------------------------------------------------------------

function firstString(v: SPValue): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parsePositiveInt(value: SPValue, fallback: number, { min = 1, max }: { min?: number; max?: number } = {}) {
  const raw = firstString(value);
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  const clampedMin = Math.max(n, min);
  return typeof max === "number" ? Math.min(clampedMin, max) : clampedMin;
}

async function resolveSearchParams(sp?: Promise<SPRecord> | SPRecord): Promise<SPRecord> {
  if (sp instanceof Promise) {
    return await sp;
  }
  return sp ?? {};
}

async function getBaseUrl() {
  const h = await headers();
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${protocol}://${host}`;
}

async function getCookieHeader() {
  const c = await cookies();
  const cookieHeader = c
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  return cookieHeader.length ? { cookie: cookieHeader } : undefined;
}

// -- page ----------------------------------------------------------------------

export default async function Page({ searchParams }: PageProps) {
  const sp = await resolveSearchParams(searchParams);

  const page = parsePositiveInt(sp.page, 1, { min: 1 });
  const pageSize = parsePositiveInt(sp.pageSize, 200, { min: 1, max: 500 });

  const base = await getBaseUrl();
  const cookieHeader = await getCookieHeader();

  const res = await fetch(`${base}/api/tcm_tally_cards_current?page=${page}&pageSize=${pageSize}`, {
    cache: "no-store",
    headers: cookieHeader,
  });

  let rows: TallyCardRow[] = [];
  let total = 0;

  if (res.ok) {
    const payload = (await res.json()) ?? {};
    const parsedRows = (payload.rows ?? payload.data ?? []) as TallyCardRow[];
    const parsedTotal = Number(payload.total ?? payload.count ?? parsedRows.length);
    rows = parsedRows;
    total = Number.isFinite(parsedTotal) ? parsedTotal : parsedRows.length;
  } else {
    // Keep SSR stable even on API errors
    rows = [];
    total = 0;
  }

  return (
    <PageShell
      title="View Tally Cards"
      count={total}
      toolbarConfig={tallyCardsToolbar}
      toolbarActions={tallyCardsActions}
      chipConfig={tallyCardsChips}
      // Enable advanced filters to show Sort, Columns, and Export buttons
      enableAdvancedFilters={true}
    >
      <ResourceTableClient<TallyCardRow>
        config={tallyCardsViewConfig}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
