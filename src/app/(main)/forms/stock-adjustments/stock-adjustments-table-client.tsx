"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 * 
 * This is needed because buildColumns() calls makeActionsColumn() which is client-only.
 * We can't pass functions from server to client components in Next.js.
 */
import { useMemo } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { StockAdjustmentRow } from "./stock-adjustments.config";
import { stockAdjustmentsViewConfig } from "./stock-adjustments.config";

interface StockAdjustmentsTableClientProps {
  initialRows: StockAdjustmentRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function StockAdjustmentsTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
}: StockAdjustmentsTableClientProps) {
  // Materialize columns in client context (where makeActionsColumn() can execute)
  // Memoize to prevent unstable reference that triggers unnecessary recalculations
  const viewConfigWithColumns = useMemo<BaseViewConfig<StockAdjustmentRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...stockAdjustmentsViewConfig,
      columns: stockAdjustmentsViewConfig.buildColumns(),
      // Explicitly preserve apiEndpoint from viewConfig (VIEW endpoint, not TABLE)
      apiEndpoint: stockAdjustmentsViewConfig.apiEndpoint,
    };
    // Remove buildColumns function since columns are materialized
    delete (config as any).buildColumns;
    return config;
  }, []); // Empty deps since buildColumns should be pure

  // Initial column visibility: hide full_name (name column) and multi_location (now shown as badge in location column)
  const initialColumnVisibility = useMemo(() => {
    return {
      id: false, // Always hide routing id
      tally_card_number: true,
      warehouse: true,
      full_name: false, // Hidden
      reason_code: true,
      multi_location: false, // Hidden - now shown as MULTI badge in location column
      qty: true,
      location: true,
      updated_at_pretty: true,
      actions: true,
    };
  }, []);

  return (
    <ResourceTableClient
      config={viewConfigWithColumns}
      initialRows={initialRows}
      initialTotal={initialTotal}
      page={page}
      pageSize={pageSize}
      initialColumnVisibility={initialColumnVisibility}
    />
  );
}

