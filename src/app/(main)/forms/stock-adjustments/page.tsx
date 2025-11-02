// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/page.tsx
// TYPE: Server Component (SSR + Client Hydration)
// PURPOSE: Server-side data fetching with client-side optimizations
// PERFORMANCE: SSR for fast initial load + React Query for client-side caching
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";
import { RESOURCE_TITLE, API_ENDPOINT } from "./constants";
import { StockAdjustmentsClient } from "./stock-adjustments-client";
import { StockAdjustmentsErrorBoundary } from "./stock-adjustments-error-boundary";
import { toRow } from "./to-row";
import { statusToQuery } from "./filters";

// 🧾 Browser tab title for this screen (pairs with root layout title template)
export const metadata: Metadata = {
  title: RESOURCE_TITLE,
};

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize: 5, max: 500 });

  // Handle status filter from quick filters
  const statusFilter = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const extraQuery: Record<string, any> = { raw: "true" };
  
  // Add status filter if specified
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