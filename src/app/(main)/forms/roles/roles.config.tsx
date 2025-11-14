// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/roles/roles.config.tsx
// TYPE: Unified config for Roles screen
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
const ROUTE_SEGMENT = "roles" as const;
const API_ENDPOINT = "/api/roles" as const;
export const RESOURCE_KEY = "roles" as const;
const PERMISSION_PREFIX = `screen:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Roles" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type RoleRow = {
  id: string;
  role_code: string;
  role_name: string;
  warehouses: string[];
  is_active: boolean;
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<RoleRow>[] {
  return [
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
      id: "role_code",
      accessorKey: "role_code",
      header: "Role Code",
      cell: ({ row }) => {
        const id = row.original.id;
        const code = row.getValue<string>("role_code");
        
        return (
          <Link
            href={`/forms/roles/${id}/edit`}
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
      id: "role_name",
      accessorKey: "role_name",
      header: "Role Name",
      enableSorting: true,
      size: 200,
    },
    {
      id: "warehouses",
      accessorKey: "warehouses",
      header: "Warehouses",
      cell: ({ row }) => {
        const warehouses = row.getValue<string[]>("warehouses");
        return warehouses && warehouses.length > 0 ? warehouses.join(", ") : "—";
      },
      enableSorting: false,
      size: 300,
    },
    {
      id: "is_active",
      accessorKey: "is_active",
      header: "Active",
      enableSorting: true,
      size: 100,
    },
    makeActionsColumn<RoleRow>(),
  ];
}

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const rolesViewConfig: BaseViewConfig<RoleRow> = {
  resourceKeyForDelete: RESOURCE_KEY,
  formsRouteSegment: ROUTE_SEGMENT,
  idField: "id",
  apiEndpoint: API_ENDPOINT,
  toolbar: { left: [], right: [] },
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
export const rolesToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Role",
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
    {
      id: "exportCsv",
      label: "Export CSV",
      icon: "Download",
      variant: "outline",
      onClickId: "exportCsv",
    },
  ],
  right: [],
};

// -----------------------------------------------------------------------------
// Actions Config
// -----------------------------------------------------------------------------
export const rolesActions: ActionConfig = {
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
  viewConfig: rolesViewConfig,
  toolbar: rolesToolbar,
  actions: rolesActions,
};

