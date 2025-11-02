"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 * 
 * This is needed because buildColumns() calls makeActionsColumn() which is client-only.
 * We can't pass functions from server to client components in Next.js.
 */
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
  const viewConfigWithColumns: BaseViewConfig<StockAdjustmentRow> & {
    columns?: any[];
  } = {
    ...stockAdjustmentsViewConfig,
    columns: stockAdjustmentsViewConfig.buildColumns(),
  };
  // Remove buildColumns function since columns are materialized
  delete (viewConfigWithColumns as any).buildColumns;

  return (
    <ResourceTableClient
      config={viewConfigWithColumns}
      initialRows={initialRows}
      initialTotal={initialTotal}
      page={page}
      pageSize={pageSize}
    />
  );
}

