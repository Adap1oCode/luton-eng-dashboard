// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/permissions/permissions.config.tsx
// TYPE: Unified config for Permissions screen
// PURPOSE: Single config file (aligned with warehouses pattern)
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
const ROUTE_SEGMENT = "permissions" as const;
const API_ENDPOINT = "/api/permissions" as const;
export const RESOURCE_KEY = "permissions" as const;
const PERMISSION_PREFIX = `screen:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Permissions" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type PermissionRow = {
  id: string; // PK (same as key), used for routing
  key: string; // Alias for id, kept for compatibility
  description: string | null;
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<PermissionRow>[] {
  return [
    {
      id: "key",
      accessorKey: "key",
      header: "Key",
      cell: ({ row }) => {
        const key = row.getValue<string>("key");
        
        return (
          <Link
            href={`/forms/permissions/${encodeURIComponent(key)}/edit`}
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
          >
            {key}
          </Link>
        );
      },
      enableSorting: true,
      size: 300,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      enableSorting: true,
      size: 400,
    },
    makeActionsColumn<PermissionRow>(),
  ];
}

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const permissionsViewConfig: BaseViewConfig<PermissionRow> = {
  resourceKeyForDelete: RESOURCE_KEY,
  formsRouteSegment: ROUTE_SEGMENT,
  idField: "key",
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
export const permissionsToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Permission",
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
export const permissionsActions: ActionConfig = {
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
  viewConfig: permissionsViewConfig,
  toolbar: permissionsToolbar,
  actions: permissionsActions,
};

