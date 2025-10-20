"use client";
import * as React from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { SortAsc, SortDesc, ArrowUpDown } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { makeDefaultToolbar, type BaseViewConfig, makeActionsColumn } from "@/components/data-table/view-defaults";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

    {
      accessorKey: "tally_card_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tally Card Number" />,
      cell: ({ row }) => {
        return <div className="font-medium">{row.getValue("tally_card_number")}</div>;
      },
    },
    {
      accessorKey: "item_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Number" />,
      cell: ({ row }) => {
        return <div>{row.getValue("item_number")}</div>;
      },
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const isActive = row.getValue("is_active");
        return (
          <Badge
            variant="secondary"
            className={`${isActive ? "bg-orange-500" : "bg-gray-500"} hover:bg-opacity-80 text-white`}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "warehouse",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
      cell: ({ row }) => {
        return <div>{row.getValue("warehouse")}</div>;
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
};

// NB: toolbar for DataTable must use icon components (not strings)
// tallyCardsViewConfig (object export)
export const tallyCardsViewConfig: BaseViewConfig<TallyCardRow> = {
  features,
  toolbar: { left: undefined, right: [] },
  quickFilters,
  buildColumns: () => buildColumns(),
  // نحدد مورد الحذف الصحيح من الجدول الأصلي وليس الـ view
  resourceKeyForDelete: "tcm_tally_cards",
  // Route segment for forms navigation
  formsRouteSegment: "tally-cards",
};
