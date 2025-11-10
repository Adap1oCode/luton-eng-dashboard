// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/warehouse-locations/warehouse-locations.config.tsx
// TYPE: Unified config for Warehouse Locations screen
// PURPOSE: Single config file (aligned with stock-adjustments pattern)
// -----------------------------------------------------------------------------

import Link from "next/link";
import { Plus, Trash2, Download } from "lucide-react";
import type {
  ToolbarConfig,
  ActionConfig,
} from "@/components/forms/shell/toolbar/types";
import {
  makeActionsColumn,
  type BaseViewConfig,
  type TColumnDef,
} from "@/components/data-table/view-defaults";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const ROUTE_SEGMENT = "warehouse-locations" as const;
const API_ENDPOINT = "/api/warehouse-locations" as const;
export const RESOURCE_KEY = "warehouse_locations" as const;
const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Warehouse Locations" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type WarehouseLocationRow = {
  id: string; // Hidden in UI, used for routing
  warehouse_id: string;
  warehouse_name: string | null; // Enriched from warehouses table
  warehouse_code: string | null; // Enriched from warehouses table
  name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<WarehouseLocationRow>[] {
  return [
    // Hidden routing-only id
    {
      id: "id",
      accessorKey: "id",
      header: () => null,
      cell: () => null,
      enableHiding: true,
      enableSorting: false,
      enableColumnFilter: false,
      size: 0,
      meta: { routingOnly: true },
    },
    {
      id: "warehouse_name",
      accessorKey: "warehouse_name",
      header: "Warehouse",
      cell: ({ row }) => {
        const warehouseName = row.getValue<string | null>("warehouse_name");
        // warehouse_code is not a column, access it from row.original
        const warehouseCode = row.original.warehouse_code ?? null;
        
        if (!warehouseName && !warehouseCode) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        // Show name if available, otherwise code
        return <span>{warehouseName || warehouseCode}</span>;
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Location Name",
      cell: ({ row }) => {
        const id = row.original.id;
        const name = row.getValue<string>("name");
        
        return (
          <Link
            href={`/forms/warehouse-locations/${id}/edit`}
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
          >
            {name}
          </Link>
        );
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "is_active",
      accessorKey: "is_active",
      header: "Active",
      enableSorting: true,
      size: 100,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created",
      enableSorting: true,
      size: 180,
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      header: "Updated",
      enableSorting: true,
      size: 180,
    },
    makeActionsColumn<WarehouseLocationRow>(),
  ];
}

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const warehouseLocationsViewConfig: BaseViewConfig<WarehouseLocationRow> = {
  resourceKeyForDelete: RESOURCE_KEY,
  formsRouteSegment: ROUTE_SEGMENT,
  idField: "id",
  apiEndpoint: API_ENDPOINT,
  toolbar: {
    left: [],
    right: [],
  },
  quickFilters: [],
  features: {
    rowSelection: true,
    pagination: true,
    sortable: true,
  },
  buildColumns,
};

// -----------------------------------------------------------------------------
// Toolbar Config
// -----------------------------------------------------------------------------
export const warehouseLocationsToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Warehouse Location",
      icon: "Plus",
      variant: "default",
      href: `/forms/${ROUTE_SEGMENT}/new`,
      requiredAny: [`${PERMISSION_PREFIX}:create`],
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      variant: "destructive",
      action: "deleteSelected",
      enableWhen: "anySelected",
      requiredAny: [`${PERMISSION_PREFIX}:delete`],
    },
  ],
  right: [
    {
      id: "export",
      label: "Export",
      icon: "Download",
      variant: "outline",
      action: "exportCsv",
      requiredAny: [`${PERMISSION_PREFIX}:export`],
    },
  ],
};

// -----------------------------------------------------------------------------
// Actions Config
// -----------------------------------------------------------------------------
export const warehouseLocationsActions: ActionConfig = {
  deleteSelected: {
    method: "DELETE",
    endpoint: `${API_ENDPOINT}/bulk-delete`,
  },
  exportCsv: {
    method: "GET",
    endpoint: `${API_ENDPOINT}/export`,
    target: "_blank",
  },
};

// -----------------------------------------------------------------------------
// Combined Config
// -----------------------------------------------------------------------------
export const config = {
  title: RESOURCE_TITLE,
  apiEndpoint: API_ENDPOINT,
  resourceKey: RESOURCE_KEY,
  viewConfig: warehouseLocationsViewConfig,
  toolbar: warehouseLocationsToolbar,
  actions: warehouseLocationsActions,
};

