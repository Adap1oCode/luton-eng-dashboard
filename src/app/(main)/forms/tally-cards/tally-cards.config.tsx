// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/tally-cards.config.tsx
// TYPE: Unified config for Tally Cards screen
// PURPOSE: Single config file (aligned with products/users pattern)
// NOTE: JSX in buildColumns() is fine - functions are called in client context
// -----------------------------------------------------------------------------

import Link from "next/link";
import { Plus, Trash2, Download } from "lucide-react";
import type {
  ToolbarConfig,
  ChipsConfig,
  ActionConfig,
} from "@/components/forms/shell/toolbar/types";
import {
  makeActionsColumn,
  type BaseViewConfig,
  type TColumnDef,
} from "@/components/data-table/view-defaults";
import type { InlineEditConfig } from "@/components/data-table/inline-edit-cell";

// -----------------------------------------------------------------------------
// Constants (inline - no separate constants.ts file)
// -----------------------------------------------------------------------------
const ROUTE_SEGMENT = "tally-cards" as const;
const API_ENDPOINT = "/api/v_tcm_tally_cards_current" as const;
const RESOURCE_KEY = "tcm_tally_cards" as const;
const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Tally Cards" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type QuickFilter = {
  id: string;
  label: string;
  type: "text" | "enum" | "boolean" | "date";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export type TallyCardRow = {
  id: string;
  card_uid?: string | null;
  warehouse_id?: string | null;
  warehouse_name?: string | null;
  tally_card_number?: string | null;
  item_number?: number | null;
  note?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  snapshot_at?: string | null;
  updated_at?: string | null;
  updated_at_pretty?: string | null;
};

// -----------------------------------------------------------------------------
// Filter Logic
// -----------------------------------------------------------------------------
/**
 * Status filter → query parameter mapping.
 * Shared between server (SSR) and client to ensure consistency.
 */
export function statusToQuery(status: string): Record<string, any> {
  if (status === "ACTIVE") return { is_active: true };
  if (status === "INACTIVE") return { is_active: false };
  return {};
}

export type QuickFilterMeta = {
  id: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export const tallyCardsFilterMeta: QuickFilterMeta[] = [
  {
    id: "status",
    toQueryParam: statusToQuery,
  },
];

// -----------------------------------------------------------------------------
// Inline Edit Config
// -----------------------------------------------------------------------------
export const INLINE_EDIT_CONFIGS: Record<string, InlineEditConfig> = {
  item_number: {
    fieldType: "text",
    placeholder: "Enter item number",
    validation: (value) => !isNaN(Number(value)),
    parseValue: (value) => Number(value),
    showBadge: false,
    formatDisplay: (value: any) => {
      if (value !== null && value !== undefined) {
        return String(value);
      }
      return "—";
    },
  },
  note: {
    fieldType: "text",
    placeholder: "Enter note",
    validation: () => true,
    parseValue: (value) => value,
    showBadge: false,
    formatDisplay: (value: any) => {
      if (value !== null && value !== undefined) {
        return String(value);
      }
      return "—";
    },
  },
};

// -----------------------------------------------------------------------------
// Columns Definition
// -----------------------------------------------------------------------------
function buildColumns(): TColumnDef<TallyCardRow>[] {
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
      id: "tally_card_number",
      accessorKey: "tally_card_number",
      header: "Tally Card Number",
      cell: ({ row }) => {
        const id = row.original.id;
        const tallyCardNumber = row.getValue<string | null>("tally_card_number");
        
        if (!tallyCardNumber) {
          return <span className="text-muted-foreground">—</span>;
        }

        return (
          <Link
            href={`/forms/tally-cards/${id}/edit`}
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
          >
            {tallyCardNumber}
          </Link>
        );
      },
      enableSorting: true,
      size: 180,
    },
    {
      id: "warehouse_id",
      accessorKey: "warehouse_id",
      header: "Warehouse ID",
      enableSorting: true,
      size: 160,
    },
    {
      id: "warehouse_name",
      accessorKey: "warehouse_name",
      header: "Warehouse",
      enableSorting: true,
      size: 180,
    },
    {
      id: "item_number",
      accessorKey: "item_number",
      header: "Item Number",
      meta: {
        inlineEdit: INLINE_EDIT_CONFIGS.item_number,
      },
      enableSorting: true,
      size: 140,
    },
    {
      id: "note",
      accessorKey: "note",
      header: "Note",
      meta: {
        inlineEdit: INLINE_EDIT_CONFIGS.note,
      },
      enableSorting: false,
      size: 280,
    },
    {
      id: "is_active",
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => {
        const isActive = row.getValue<boolean | null>("is_active");
        return (
          <span className={isActive ? "text-green-600" : "text-gray-400"}>
            {isActive ? "Yes" : "No"}
          </span>
        );
      },
      enableSorting: true,
      size: 100,
    },
    {
      id: "snapshot_at",
      header: "Snapshot",
      accessorFn: (row) => row.snapshot_at ?? row.created_at ?? null,
      enableSorting: true,
      size: 180,
    },
    {
      id: "updated_at_pretty",
      header: "Updated",
      accessorFn: (row) => row.updated_at_pretty ?? row.updated_at ?? null,
      enableSorting: true,
      size: 180,
    },
    makeActionsColumn<TallyCardRow>(),
  ];
}

// -----------------------------------------------------------------------------
// Quick Filters
// -----------------------------------------------------------------------------
export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All tally cards" },
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
    ],
    defaultValue: "ALL",
    toQueryParam: statusToQuery,
  },
];

// -----------------------------------------------------------------------------
// View Config
// -----------------------------------------------------------------------------
export const tallyCardsViewConfig: BaseViewConfig<TallyCardRow> = {
  resourceKeyForDelete: RESOURCE_KEY,
  formsRouteSegment: ROUTE_SEGMENT,
  idField: "id",
  // @ts-expect-error - apiEndpoint is used at runtime but not in BaseViewConfig type
  apiEndpoint: API_ENDPOINT, // VIEW endpoint for list/view-all screen (not TABLE endpoint)
  toolbar: { left: undefined, right: [] },
  quickFilters: quickFilters,
  features: {
    rowSelection: true,
    pagination: true,
  },
  buildColumns: () => buildColumns(),
  // Hide Views and Save View buttons in bottom toolbar
  bottomToolbarButtons: {
    views: false,
    saveView: false,
    // Keep other buttons visible (columns, sort, moreFilters)
    columns: true,
    sort: true,
    moreFilters: true,
  },
};

// -----------------------------------------------------------------------------
// Toolbar Config
// -----------------------------------------------------------------------------
export const tallyCardsToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Tally Card",
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

export const tallyCardsActions: ActionConfig = {
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

export const tallyCardsChips: ChipsConfig | undefined = undefined;

// -----------------------------------------------------------------------------
// Bundled Config Export (for page.tsx)
// -----------------------------------------------------------------------------
export const title = RESOURCE_TITLE;

export const config = {
  title: RESOURCE_TITLE,
  viewConfig: tallyCardsViewConfig,
  toolbar: tallyCardsToolbar,
  chips: tallyCardsChips,
  actions: tallyCardsActions,
  quickFilters: quickFilters,
  routeSegment: ROUTE_SEGMENT,
  apiEndpoint: API_ENDPOINT,
  resourceKey: RESOURCE_KEY,
  permissionPrefix: PERMISSION_PREFIX,
};


