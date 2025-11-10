// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/inventory-current/inventory-current.config.tsx
// TYPE: Unified config for Inventory Current screen
// PURPOSE: Read-only view screen for v_inventory_current
// -----------------------------------------------------------------------------

import { Download } from "lucide-react";
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
const ROUTE_SEGMENT = "inventory-current" as const;
const API_ENDPOINT = "/api/inventory-current" as const;
export const RESOURCE_KEY = "inventory-current" as const; // Use friendly alias
const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Inventory Current" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type InventoryCurrentRow = {
  id: string; // Stable identifier for client table behaviors
  item_number: number | null; // bigint, used as primary key
  warehouse: string | null;
  location: string | null;
  type: string | null;
  description: string | null;
  unit_of_measure: string | null;
  category: string | null;
  stocking_unit: string | null;
  total_available: number | null;
  total_in_house: number | null;
  total_checked_out: number | null;
  on_order: number | null;
  committed: number | null;
  tax_code: string | null;
  item_cost: number | null;
  cost_method: string | null;
  item_list_price: number | null;
  item_sale_price: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  weight: number | null;
  max_volume: number | null;
  duplicate_item_check: boolean | null;
  inventory_readded: boolean | null;
  inventory_removed: boolean | null;
  is_deleted: boolean | null;
  uom_updated: boolean | null;
  match_status: number | null;
  description_norm: string | null;
  category_new: string | null;
  tally_card_number: string | null;
  tc_bp1: string | null;
  tc_bp2: string | null;
  tc_am1: string | null;
  tc_am2: string | null;
  tc_am3: string | null;
  tc_rtz: string | null;
  tc_bc: string | null;
  tc_cc: string | null;
  tc_bdi: string | null;
  last_sync_date: string | null;
  sync_enum: string | null;
  adj_type: number | null;
  adj_match_code: string | null;
  adj_qty: number | null;
  adj_date: string | null;
  content_hash: string | null;
  snapshot_date: string | null;
  insert_id: number | null;
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<InventoryCurrentRow>[] {
  return [
    {
      id: "item_number",
      accessorKey: "item_number",
      header: "Item Number",
      cell: ({ row }) => {
        const itemNumber = row.getValue<number | null>("item_number");
        return <span>{itemNumber?.toLocaleString() ?? "—"}</span>;
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "warehouse",
      accessorKey: "warehouse",
      header: "Warehouse",
      cell: ({ row }) => {
        const warehouse = row.getValue<string | null>("warehouse");
        return <span>{warehouse ?? <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "location",
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.getValue<string | null>("location");
        return <span>{location ?? <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue<string | null>("description");
        return <span>{description ?? <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 300,
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue<string | null>("category");
        return <span>{category ?? <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "unit_of_measure",
      accessorKey: "unit_of_measure",
      header: "Unit of Measure",
      cell: ({ row }) => {
        const uom = row.getValue<string | null>("unit_of_measure");
        return <span>{uom ?? <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "total_available",
      accessorKey: "total_available",
      header: "Total Available",
      cell: ({ row }) => {
        const total = row.getValue<number | null>("total_available");
        return <span>{total != null ? total.toLocaleString() : <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "item_cost",
      accessorKey: "item_cost",
      header: "Item Cost",
      cell: ({ row }) => {
        const cost = row.getValue<number | null>("item_cost");
        return <span>{cost != null ? cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "on_order",
      accessorKey: "on_order",
      header: "On Order",
      cell: ({ row }) => {
        const onOrder = row.getValue<number | null>("on_order");
        return <span>{onOrder != null ? onOrder.toLocaleString() : <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "committed",
      accessorKey: "committed",
      header: "Committed",
      cell: ({ row }) => {
        const committed = row.getValue<number | null>("committed");
        return <span>{committed != null ? committed.toLocaleString() : <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 150,
    },
    // No actions column for read-only view
  ];
}

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const inventoryCurrentViewConfig: BaseViewConfig<InventoryCurrentRow> & { apiEndpoint?: string } = {
  resourceKeyForDelete: RESOURCE_KEY, // Not used for read-only, but required by type
  formsRouteSegment: ROUTE_SEGMENT,
  idField: "id",
  apiEndpoint: API_ENDPOINT,
  toolbar: {
    left: [],
    right: [],
  },
  quickFilters: [],
  features: {
    rowSelection: false, // Read-only, no selection needed
    pagination: true,
    sortable: true,
  },
  buildColumns,
};

// -----------------------------------------------------------------------------
// Toolbar Config (read-only, export only)
// -----------------------------------------------------------------------------
export const inventoryCurrentToolbar: ToolbarConfig = {
  left: [],
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
export const inventoryCurrentActions: ActionConfig = {
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
  viewConfig: inventoryCurrentViewConfig,
  toolbar: inventoryCurrentToolbar,
  actions: inventoryCurrentActions,
};

