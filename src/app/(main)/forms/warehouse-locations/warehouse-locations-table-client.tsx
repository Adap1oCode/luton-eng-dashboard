"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 */
import { useMemo } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { WarehouseLocationRow } from "./warehouse-locations.config";
import { warehouseLocationsViewConfig } from "./warehouse-locations.config";

interface WarehouseLocationsTableClientProps {
  initialRows: WarehouseLocationRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function WarehouseLocationsTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
}: WarehouseLocationsTableClientProps) {
  // Materialize columns in client context
  const viewConfigWithColumns = useMemo<
    BaseViewConfig<WarehouseLocationRow> & { columns?: any[]; apiEndpoint?: string }
  >(() => {
    const config = {
      ...warehouseLocationsViewConfig,
      columns: warehouseLocationsViewConfig.buildColumns?.() ?? [],
      apiEndpoint: warehouseLocationsViewConfig.apiEndpoint,
    };
    delete (config as any).buildColumns;
    return config;
  }, []);

  // Initial column visibility: hide id and warehouse_id columns
  const initialColumnVisibility = useMemo(() => {
    return {
      id: false, // Always hide routing id
      warehouse_id: false, // Hide warehouse_id (show warehouse_name instead)
      warehouse_name: true, // Show warehouse name
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
