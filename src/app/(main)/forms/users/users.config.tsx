// Auto-generated configuration for User Management
import { BaseViewConfig } from "@/components/data-table/view-defaults";
import { ToolbarConfig, ActionConfig } from "@/components/forms/shell/toolbar/types";

export const usersViewConfig: BaseViewConfig<any> = {
  resourceKeyForDelete: "users",
  formsRouteSegment: "users",
  idField: "id",
  toolbar: { left: [], right: [] },
  quickFilters: [],
  features: {
    rowSelection: true,
    pagination: true,
    sortable: true,
  },
  buildColumns: () => [
    {
      id: "id",
      accessorKey: "id",
      header: "Id",
      cell: ({ row }) => row.getValue("id"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.getValue("name"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.getValue("email"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => row.getValue("role"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => row.getValue("created_at"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "active",
      accessorKey: "active",
      header: "Active",
      cell: ({ row }) => row.getValue("active"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    }
  ],
};

export const usersToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New User Management",
      icon: "Plus",
      variant: "default",
      href: "/forms/users/new",
      requiredAny: ["resource:users:create"],
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      variant: "destructive",
      action: "deleteSelected",
      enableWhen: "anySelected",
      requiredAny: ["resource:users:delete"],
    },
  ],
  right: [],
};

export const usersActions: ActionConfig = {
  deleteSelected: {
    method: "DELETE",
    endpoint: "/api/users/bulk-delete",
  },
  exportCsv: {
    method: "GET",
    endpoint: "/api/users/export",
    target: "_blank",
  },
};

export const usersChips = [
  {
    id: "id",
    label: "Id",
    type: "text",
  },
  {
    id: "name",
    label: "Name",
    type: "text",
  },
  {
    id: "email",
    label: "Email",
    type: "text",
  },
  {
    id: "role",
    label: "Role",
    type: "text",
  },
  {
    id: "created_at",
    label: "Created At",
    type: "date",
  },
  {
    id: "active",
    label: "Active",
    type: "boolean",
  }
];

export const title = "User Management";

export const config = {
  title,
  viewConfig: usersViewConfig,
  toolbar: usersToolbar,
  chips: usersChips,
  actions: usersActions,
};