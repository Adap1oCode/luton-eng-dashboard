"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 * 
 * This is needed because buildColumns() calls makeActionsColumn() which is client-only.
 * We can't pass functions from server to client components in Next.js.
 */
import { useMemo, useState, useCallback } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { InventoryInfoDialog } from "@/components/inventory/inventory-info-dialog";
import type { TallyCardRow } from "./tally-cards.config";
import { tallyCardsViewConfig, buildColumns } from "./tally-cards.config";

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
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [selectedItemNumber, setSelectedItemNumber] = useState<string | number | null>(null);

  const handleItemNumberClick = useCallback((itemNumber: string | number | null) => {
    setSelectedItemNumber(itemNumber);
    setShowInventoryDialog(true);
  }, []);

  // Materialize columns in client context (where makeActionsColumn() can execute)
  // Memoize to prevent unstable reference that triggers unnecessary recalculations
  const viewConfigWithColumns = useMemo<BaseViewConfig<TallyCardRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...tallyCardsViewConfig,
      columns: buildColumns(handleItemNumberClick),
      // Explicitly preserve apiEndpoint from viewConfig (VIEW endpoint, not TABLE)
      apiEndpoint: tallyCardsViewConfig.apiEndpoint,
    };
    // Remove buildColumns function since columns are materialized
    delete (config as any).buildColumns;
    return config;
  }, [handleItemNumberClick]);

  // Initial column visibility: hide warehouse_id, note, and snapshot_at
  const initialColumnVisibility = useMemo(() => {
    return {
      id: false, // Always hide routing id
      tally_card_number: true,
      warehouse_id: false, // Hidden
      warehouse_name: true,
      item_number: true,
      note: false, // Hidden
      is_active: true,
      snapshot_at: false, // Hidden
      updated_at_pretty: true,
      actions: true,
    };
  }, []);

  // Initial sorting: by tally_card_number ASC
  const initialSorting = useMemo(() => {
    return [{ id: "tally_card_number", desc: false }];
  }, []);

  return (
    <>
      <ResourceTableClient
        config={viewConfigWithColumns}
        initialRows={initialRows}
        initialTotal={initialTotal}
        page={page}
        pageSize={pageSize}
        initialColumnVisibility={initialColumnVisibility}
        initialSorting={initialSorting}
      />
      <InventoryInfoDialog
        open={showInventoryDialog}
        onOpenChange={setShowInventoryDialog}
        itemNumber={selectedItemNumber}
      />
    </>
  );
}

