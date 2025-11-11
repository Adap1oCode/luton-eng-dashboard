"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 */
import { useMemo } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { InventoryUniqueRow } from "./inventory-unique.config";
import { inventoryUniqueViewConfig } from "./inventory-unique.config";

interface InventoryUniqueTableClientProps {
  initialRows: InventoryUniqueRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function InventoryUniqueTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
}: InventoryUniqueTableClientProps) {
  // Materialize columns in client context
  const viewConfigWithColumns = useMemo<
    BaseViewConfig<InventoryUniqueRow> & { columns?: any[]; apiEndpoint?: string }
  >(() => {
    const config = {
      ...inventoryUniqueViewConfig,
      columns: inventoryUniqueViewConfig.buildColumns?.() ?? [],
      apiEndpoint: inventoryUniqueViewConfig.apiEndpoint,
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
      unit_of_measure: true,
      event_type: true,
      snapshot_date: true,
      content_hash: false, // Hide hash by default (can be shown if needed)
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
