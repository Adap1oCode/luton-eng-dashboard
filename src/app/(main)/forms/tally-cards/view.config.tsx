"use client";
import * as React from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { SortAsc, SortDesc, ArrowUpDown } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { InlineEditConfig } from "@/components/data-table/inline-edit-cell";
import { type BaseViewConfig, makeActionsColumn } from "@/components/data-table/view-defaults";
import { Badge } from "@/components/ui/badge";
import type { TallyCardRow } from "@/lib/data/resources/tally_cards/types";

export type TableFeatures = {
  sortable?: boolean;
  globalSearch?: boolean;
  exportCsv?: boolean;
  pagination?: boolean;
  rowSelection?: boolean;
  dnd?: boolean;
  saveView?: boolean;
  viewStorageKey?: string;
  columnResizing?: boolean;
  columnReordering?: boolean;
  advancedFilters?: boolean;
  inlineEditing?: boolean;
};

// cspell:disable-next-line
// تعريف الأنواع المطلوبة لتوافق FilterBar
export type SortDirection = "asc" | "desc" | "none";
export type SortType = "alphabetical" | "date";
export type ColumnConfig = {
  id: string;
  label: string;
  width: string;
  required?: boolean;
  sortType: SortType;
  sortOptions: Array<{
    label: string;
    value: SortDirection;
    icon: React.ComponentType<{ className?: string }>;
  }>;
};

// Inline editing configurations for different fields
export const INLINE_EDIT_CONFIGS: Record<string, InlineEditConfig> = {
  is_active: {
    fieldType: "boolean",
    options: [
      {
        value: true,
        label: "Active",
        variant: "default",
        className: "bg-orange-500 hover:bg-orange-600 text-white",
      },
      {
        value: false,
        label: "Inactive",
        variant: "secondary",
        className: "bg-gray-500 hover:bg-gray-600 text-white",
      },
    ],
  },
  status: {
    fieldType: "select",
    options: [
      { value: "Active", label: "Active", variant: "default" },
      { value: "Inactive", label: "Inactive", variant: "secondary" },
      { value: "Pending", label: "Pending", variant: "outline" },
      { value: "Completed", label: "Completed", variant: "default" },
    ],
  },
};

export const STATUS_OPTIONS = ["Active", "Inactive"];

export const COLUMNS: ColumnConfig[] = [
  {
    id: "tally_card_number",
    label: "Tally Card Number",
    width: "30%",
    required: true,
    sortType: "alphabetical",
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "item_number",
    label: "Item Number",
    width: "25%",
    sortType: "alphabetical",
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "status",
    label: "Status",
    width: "20%",
    sortType: "alphabetical",
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
  {
    id: "warehouse",
    label: "Warehouse",
    width: "20%",
    sortType: "alphabetical",
    sortOptions: [
      { label: "A to Z", value: "asc", icon: SortAsc },
      { label: "Z to A", value: "desc", icon: SortDesc },
      { label: "Clear Sorting", value: "none", icon: ArrowUpDown },
    ],
  },
];

export const ACTIONS_COLUMN: ColumnConfig & { fixed: boolean; sortable: boolean } = {
  id: "actions",
  label: "",
  width: "5%",
  required: true,
  fixed: true,
  sortable: false,
  sortType: "alphabetical",
  sortOptions: [],
};

export type QuickFilter = {
  id: string;
  label: string;
  type: "text" | "enum";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
};

export function buildColumns(): ColumnDef<TallyCardRow>[] {
  return [
    // Hidden id column for row identification and actions
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

    // ✅ Tally Card Number as hyperlink (Fixed TypeScript error here)
    {
      accessorKey: "tally_card_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tally Card Number" />,
      cell: ({ row }) => {
        const id = row.original.id;
        const number = row.getValue<string>("tally_card_number");
        return (
          <a
            href={`/forms/tally-cards/edit/${id}`}
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
          >
            {number}
          </a>
        );
      },
    },
    {
      accessorKey: "item_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Number" />,
      cell: ({ row }) => {
        const itemNumber = row.getValue<string>("item_number");
        return <div>{itemNumber}</div>;
      },
    },
    {
      accessorKey: "is_active",
      id: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const isActive = row.getValue<boolean>("is_active");
        return (
          <Badge
            variant="secondary"
            className={`${isActive ? "bg-orange-500" : "bg-gray-500"} hover:bg-opacity-80 text-white`}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      meta: {
        inlineEdit: INLINE_EDIT_CONFIGS.is_active,
      },
    },
    {
      accessorKey: "warehouse",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
      cell: ({ row }) => {
        const warehouse = row.getValue<string>("warehouse");
        return <div>{warehouse}</div>;
      },
    },
    // عمود الإجراءات - دايماً في الآخر
    {
      ...makeActionsColumn<TallyCardRow>(),
      enableHiding: false,
      enableResizing: false,
      enableSorting: false,
      enableColumnFilter: false,
      meta: { pinned: "right" },
    },
  ];
}

export const quickFilters: QuickFilter[] = [
  {
    id: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "ALL", label: "All statuses" },
      { value: "ACTIVE", label: "Active only" },
      { value: "INACTIVE", label: "Inactive only" },
    ],
    defaultValue: "ALL",
  },
];

export const features: TableFeatures = {
  sortable: true,
  globalSearch: true,
  exportCsv: true,
  pagination: true,
  rowSelection: true,
  dnd: false,
  saveView: false,
  viewStorageKey: "tally-cards-view",
  columnResizing: true,
  columnReordering: true,
  advancedFilters: true,
  inlineEditing: true,
};

// NB: toolbar for DataTable must use icon components (not strings)
// tallyCardsViewConfig (object export)
export const tallyCardsViewConfig: BaseViewConfig<TallyCardRow> = {
  features,
  toolbar: { left: undefined, right: [] },
  quickFilters,
  buildColumns: () => buildColumns(),
  resourceKeyForDelete: "tcm_tally_cards",
  formsRouteSegment: "tally-cards",
};
