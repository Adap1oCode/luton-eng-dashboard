// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/warehouses/warehouses.config.tsx
// TYPE: Unified config for Warehouses screen
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
const ROUTE_SEGMENT = "warehouses" as const;
const API_ENDPOINT = "/api/warehouses" as const;
export const RESOURCE_KEY = "warehouses" as const;
const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Warehouses" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type WarehouseRow = {
  id: string; // Hidden in UI, used for routing
  code: string;
  name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<WarehouseRow>[] {
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
      id: "code",
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => {
        const id = row.original.id;
        const code = row.getValue<string>("code");
        
        return (
          <Link
            href={`/forms/warehouses/${id}/edit`}
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
          >
            {code}
          </Link>
        );
      },
      enableSorting: true,
      size: 160,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
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
    makeActionsColumn<WarehouseRow>(),
  ];
}

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const warehousesViewConfig: BaseViewConfig<WarehouseRow> = {
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
export const warehousesToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Warehouse",
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
export const warehousesActions: ActionConfig = {
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
  viewConfig: warehousesViewConfig,
  toolbar: warehousesToolbar,
  actions: warehousesActions,
};


