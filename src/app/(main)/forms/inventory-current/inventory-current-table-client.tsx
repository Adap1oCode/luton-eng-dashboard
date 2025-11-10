"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 */
import { useMemo } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { InventoryCurrentRow } from "./inventory-current.config";
import { inventoryCurrentViewConfig } from "./inventory-current.config";

interface InventoryCurrentTableClientProps {
  initialRows: InventoryCurrentRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function InventoryCurrentTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
}: InventoryCurrentTableClientProps) {
  // Materialize columns in client context
  const viewConfigWithColumns = useMemo<BaseViewConfig<InventoryCurrentRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...inventoryCurrentViewConfig,
      columns: inventoryCurrentViewConfig.buildColumns(),
      apiEndpoint: inventoryCurrentViewConfig.apiEndpoint,
    };
    delete (config as any).buildColumns;
    return config;
  }, []);

  // Initial column visibility: show all columns by default
  const initialColumnVisibility = useMemo(() => {
    return {
      item_number: true,
      warehouse: true,
      location: true,
      description: true,
      category: true,
      unit_of_measure: true,
      total_available: true,
      item_cost: true,
      on_order: true,
      committed: true,
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

