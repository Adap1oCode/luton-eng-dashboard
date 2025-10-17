// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// TYPE: Server Component
// PURPOSE: SSR page for "View All Tally Cards" using shared Shell + ResourceTableClient
// -----------------------------------------------------------------------------

import { headers, cookies } from "next/headers";

import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import PageShell from "@/components/forms/shell/page-shell";
import { mapRows } from "@/lib/data/resources/tally_cards/projection";
import type { TallyCardRow } from "@/lib/data/resources/tally_cards/types";

import { tallyCardsToolbar, tallyCardsChips, tallyCardsActions } from "./toolbar.config";
import { tallyCardsViewConfig, features, type TableFeatures } from "./view.config";

type SPValue = string | string[] | undefined;
type SPRecord = Record<string, SPValue>;
type PageProps = {
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
  const pageSize = parsePositiveInt(sp.pageSize, 10, { min: 1, max: 500 });

  const base = await getBaseUrl();
  const cookieHeader = await getCookieHeader();

  const res = await fetch(`${base}/api/tcm_tally_cards?page=${page}&pageSize=${pageSize}&raw=true`, {
    cache: "no-store",
    headers: cookieHeader,
  });

  let rows: TallyCardRow[] = [];
  let total = 0;

  if (res.ok) {
    const payload = (await res.json()) ?? {};
    const domainRows = (payload.rows ?? payload.data ?? []) as any[];
    const parsedTotal = Number(payload.total ?? payload.count ?? domainRows.length);

    rows = mapRows(domainRows);
    total = Number.isFinite(parsedTotal) ? parsedTotal : rows.length;
  } else {
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
      enableAdvancedFilters={true}
      showViewsButton={false}
      showSaveViewButton={false}
      enableColumnResizing={true}
      enableColumnReordering={true}
      showColumnsButton={false}
      showSortButton={false}
      showExportButton={false}
      showMoreFiltersButton={false}
    >
      <ResourceTableClient<TallyCardRow>
        config={tallyCardsViewConfig}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
        enableColumnResizing={features.columnResizing}
        enableColumnReordering={features.columnReordering}
      />
    </PageShell>
  );
}
