// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/inventory-unique/inventory-unique.config.tsx
// TYPE: Unified config for Inventory Unique screen
// PURPOSE: Read-only view screen for v_inventory_unique
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
const ROUTE_SEGMENT = "inventory-unique" as const;
const API_ENDPOINT = "/api/inventory-unique" as const;
export const RESOURCE_KEY = "inventory-unique" as const; // Use friendly alias
const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Inventory Unique" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type InventoryUniqueRow = {
  id: string;
  item_number: number; // bigint, used as primary key
  warehouse: string | null;
  location: string | null;
  description: string | null;
  unit_of_measure: string | null;
  event_type: string | null;
  snapshot_date: string | null; // date
  content_hash: string | null;
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<InventoryUniqueRow>[] {
  return [
    {
      id: "item_number",
      accessorKey: "item_number",
      header: "Item Number",
      cell: ({ row }) => {
        const itemNumber = row.getValue<number>("item_number");
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
      id: "event_type",
      accessorKey: "event_type",
      header: "Event Type",
      cell: ({ row }) => {
        const eventType = row.getValue<string | null>("event_type");
        return <span>{eventType ?? <span className="text-muted-foreground">—</span>}</span>;
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "snapshot_date",
      accessorKey: "snapshot_date",
      header: "Snapshot Date",
      cell: ({ row }) => {
        const date = row.getValue<string | null>("snapshot_date");
        if (!date) return <span className="text-muted-foreground">—</span>;
        try {
          const dateObj = new Date(date);
          return <span>{dateObj.toLocaleDateString()}</span>;
        } catch {
          return <span>{date}</span>;
        }
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "content_hash",
      accessorKey: "content_hash",
      header: "Content Hash",
      cell: ({ row }) => {
        const hash = row.getValue<string | null>("content_hash");
        if (!hash) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {hash.substring(0, 8)}...
          </span>
        );
      },
      enableSorting: true,
      size: 120,
    },
    // No actions column for read-only view
  ];
}

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const inventoryUniqueViewConfig: BaseViewConfig<InventoryUniqueRow> & { apiEndpoint?: string } = {
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
export const inventoryUniqueToolbar: ToolbarConfig = {
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
export const inventoryUniqueActions: ActionConfig = {
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
  viewConfig: inventoryUniqueViewConfig,
  toolbar: inventoryUniqueToolbar,
  actions: inventoryUniqueActions,
};

