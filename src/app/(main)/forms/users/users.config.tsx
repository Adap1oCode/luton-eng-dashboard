// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/users/users.config.tsx
// TYPE: Unified config for Users screen
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
const ROUTE_SEGMENT = "users" as const;
const API_ENDPOINT = "/api/users" as const;
export const RESOURCE_KEY = "users" as const;
const PERMISSION_PREFIX = `screen:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "User Management" as const;

export type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
  active: boolean | null;
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<UserRow>[] {
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
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const id = row.original.id;
        const name = row.getValue<string | null>("name");
        
        return (
          <Link
            href={`/forms/users/${id}/edit`}
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
          >
            {name ?? "—"}
          </Link>
        );
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      enableSorting: true,
      size: 250,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      enableSorting: true,
      size: 200,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created",
      enableSorting: true,
      size: 180,
    },
    {
      id: "active",
      accessorKey: "active",
      header: "Active",
      enableSorting: true,
      size: 100,
    },
    makeActionsColumn<UserRow>(),
  ];
}

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const usersViewConfig: BaseViewConfig<UserRow> = {
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
export const usersToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New User",
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
export const usersActions: ActionConfig = {
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
  viewConfig: usersViewConfig,
  toolbar: usersToolbar,
  actions: usersActions,
};