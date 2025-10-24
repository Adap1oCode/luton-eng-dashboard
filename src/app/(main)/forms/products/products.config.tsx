// Auto-generated configuration for Product Catalog
import { BaseViewConfig } from "@/components/data-table/view-defaults";
import { ToolbarConfig, ActionConfig } from "@/components/forms/shell/toolbar/types";

export const productsViewConfig: BaseViewConfig<any> = {
  resourceKeyForDelete: "products",
  formsRouteSegment: "products",
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
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.getValue("description"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "price",
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => row.getValue("price"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.getValue("category"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    },
    {
      id: "stock_quantity",
      accessorKey: "stock_quantity",
      header: "Stock Quantity",
      cell: ({ row }) => row.getValue("stock_quantity"),
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
    }
  ],
};

export const productsToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Product Catalog",
      icon: "Plus",
      variant: "default",
      href: "/forms/products/new",
      requiredAny: ["resource:products:create"],
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      variant: "destructive",
      action: "deleteSelected",
      enableWhen: "anySelected",
      requiredAny: ["resource:products:delete"],
    },
  ],
  right: [],
};

export const productsActions: ActionConfig = {
  deleteSelected: {
    method: "DELETE",
    endpoint: "/api/products/bulk-delete",
  },
  exportCsv: {
    method: "GET",
    endpoint: "/api/products/export",
    target: "_blank",
  },
};

export const productsChips = [
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
    id: "description",
    label: "Description",
    type: "text",
  },
  {
    id: "price",
    label: "Price",
    type: "number",
  },
  {
    id: "category",
    label: "Category",
    type: "text",
  },
  {
    id: "stock_quantity",
    label: "Stock Quantity",
    type: "text",
  },
  {
    id: "created_at",
    label: "Created At",
    type: "date",
  }
];

export const title = "Product Catalog";

export const config = {
  title,
  viewConfig: productsViewConfig,
  toolbar: productsToolbar,
  chips: productsChips,
  actions: productsActions,
};