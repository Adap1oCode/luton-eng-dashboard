"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 */
import { useMemo } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { WarehouseRow } from "./warehouses.config";
import { warehousesViewConfig } from "./warehouses.config";

interface WarehousesTableClientProps {
  initialRows: WarehouseRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function WarehousesTableClient({ initialRows, initialTotal, page, pageSize }: WarehousesTableClientProps) {
  // Materialize columns in client context
  const viewConfigWithColumns = useMemo<
    BaseViewConfig<WarehouseRow> & { columns?: any[]; apiEndpoint?: string }
  >(() => {
    const config = {
      ...warehousesViewConfig,
      columns: warehousesViewConfig.buildColumns?.() ?? [],
      apiEndpoint: warehousesViewConfig.apiEndpoint,
    };
    delete (config as any).buildColumns;
    return config;
  }, []);

  // Initial column visibility: hide id column
  const initialColumnVisibility = useMemo(() => {
    return {
      id: false, // Always hide routing id
      code: true,
      name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
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
