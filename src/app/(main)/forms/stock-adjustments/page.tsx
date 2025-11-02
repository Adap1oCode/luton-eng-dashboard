// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/page.tsx
// TYPE: Server Component (SSR + Client Hydration)
// PURPOSE: Server-side data fetching with client-side optimizations
// PERFORMANCE: SSR for fast initial load + React Query for client-side caching
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";
import { RESOURCE_TITLE, API_ENDPOINT } from "./constants";
import { StockAdjustmentsClient } from "./stock-adjustments-client";
import { StockAdjustmentsErrorBoundary } from "./stock-adjustments-error-boundary";
import { toRow } from "./to-row";
import { stockAdjustmentsFilterMeta, statusToQuery } from "./filters.meta";

// 🧾 Browser tab title for this screen (pairs with root layout title template)
export const metadata: Metadata = {
  title: RESOURCE_TITLE,
};

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize, filters } = parseListParams(sp, stockAdjustmentsFilterMeta, { defaultPage: 1, defaultPageSize: 5, max: 500 });

  // Apply status filter transform if present
  const extraQuery: Record<string, any> = { raw: "true" };
  const statusFilter = filters.status;
  if (statusFilter && statusFilter !== "ALL") {
    Object.assign(extraQuery, statusToQuery(statusFilter));
    console.log(`[Stock Adjustments] Status filter: ${statusFilter}, extraQuery:`, extraQuery);
  }

  // Server-side data fetching for fast initial load
  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: API_ENDPOINT,
    page,
    pageSize,
    extraQuery,
  });

  // Transform raw API data to expected format
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