// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Declare endpoint + columns; generic SSR wrapper does the rest.
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";
import { RESOURCE_TITLE, API_ENDPOINT } from "./constants";
import { StockAdjustmentsClient } from "./stock-adjustments-client";
import { StockAdjustmentsErrorBoundary } from "./stock-adjustments-error-boundary";

// 🧾 Browser tab title for this screen (pairs with root layout title template)
export const metadata: Metadata = {
  title: RESOURCE_TITLE,
};

function toRow(d: any) {
  return {
    id: String(d?.id ?? ""),
    user_id: String(d?.user_id ?? ""),
    full_name: String(d?.full_name ?? ""), // added
    warehouse: String(d?.warehouse ?? ""), // added
    tally_card_number: d?.tally_card_number ?? null,
    card_uid: d?.card_uid ?? null,
    qty: d?.qty ?? null,
    location: d?.location ?? null,
    note: d?.note ?? null,
    updated_at: d?.updated_at ?? null,
    is_active: d?.qty !== null && d?.qty !== undefined && Number(d?.qty) > 0, // Status based on qty
  };
}

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize: 10, max: 500 });

  // Handle status filter from quick filters
  const statusFilter = sp.status;
  const extraQuery: Record<string, any> = { raw: "true" };
  
  // Add status filter if specified
  if (statusFilter && statusFilter !== "ALL") {
    if (statusFilter === "ACTIVE") {
      extraQuery.qty_gt = 0; // Quantity greater than 0
      extraQuery.qty_not_null = true; // Also filter out null values
    } else if (statusFilter === "ZERO") {
      extraQuery.qty_eq = 0; // Quantity equals 0
    }
    console.log(`[Stock Adjustments] Status filter: ${statusFilter}, extraQuery:`, extraQuery);
  }

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: API_ENDPOINT,
    page,
    pageSize,
    extraQuery,
  });

  const rows = (domainRows ?? []).map(toRow);

  return (
    <StockAdjustmentsErrorBoundary>
      <StockAdjustmentsClient
        initialData={rows}
        initialTotal={total}
        initialPage={page}
        initialPageSize={pageSize}
      />
    </StockAdjustmentsErrorBoundary>
  );
}