// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Declare endpoint + columns; generic SSR wrapper does the rest.
// -----------------------------------------------------------------------------
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";

import { stockAdjustmentsToolbar, stockAdjustmentsChips, stockAdjustmentsActions } from "./toolbar.config";
import { stockAdjustmentsViewConfig } from "./view.config";

function toRow(d: any) {
  return {
    id: String(d?.user_id ?? d?.id ?? ""),
    user_id: String(d?.user_id ?? ""),
    full_name: String(d?.full_name ?? ""), // added
    warehouse: String(d?.warehouse ?? ""), // added
    tally_card_number: d?.tally_card_number ?? null,
    card_uid: d?.card_uid ?? null,
    qty: d?.qty ?? null,
    location: d?.location ?? null,
    note: d?.note ?? null,
    updated_at: d?.updated_at ?? null,
  };
}

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize: 10, max: 500 });

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: "/api/v_tcm_user_tally_card_entries",
    page,
    pageSize,
    extraQuery: { raw: "true" },
  });

  const rows = (domainRows ?? []).map(toRow);

  return (
    <PageShell
      title="Stock Adjustments"
      count={total}
      toolbarConfig={stockAdjustmentsToolbar}
      toolbarActions={stockAdjustmentsActions}
      chipConfig={stockAdjustmentsChips}
      enableAdvancedFilters={true}
    >
      <ResourceTableClient
        config={stockAdjustmentsViewConfig}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
