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
import type { TallyCardRow } from "./tally-cards.config";
import { tallyCardsViewConfig } from "./tally-cards.config";

interface TallyCardsTableClientProps {
  initialRows: TallyCardRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function TallyCardsTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
}: TallyCardsTableClientProps) {
  // Materialize columns in client context (where makeActionsColumn() can execute)
  // Memoize to prevent unstable reference that triggers unnecessary recalculations
  const viewConfigWithColumns = useMemo<BaseViewConfig<TallyCardRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...tallyCardsViewConfig,
      columns: tallyCardsViewConfig.buildColumns(),
      // Explicitly preserve apiEndpoint from viewConfig (VIEW endpoint, not TABLE)
      apiEndpoint: tallyCardsViewConfig.apiEndpoint,
    };
    // Remove buildColumns function since columns are materialized
    delete (config as any).buildColumns;
    return config;
  }, []); // Empty deps since buildColumns should be pure

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

