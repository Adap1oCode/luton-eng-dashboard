"use client";

import * as React from "react";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import type { TallyCardRow } from "@/lib/data/resources/tally_cards/types";

import { tallyCardsToolbar } from "./toolbar.config";

export type TableFeatures = {
  sortable?: boolean;
  globalSearch?: boolean;
  exportCsv?: boolean;
  pagination?: boolean;
  rowSelection?: boolean;
  dnd?: boolean;
  saveView?: boolean;
  viewStorageKey?: string;
};

export type QuickFilter = {
  id: string;
  label: string;
  type: "text" | "enum";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
};

export function buildColumns(includeActions: boolean = true): ColumnDef<TallyCardRow, any>[] {
  return [
    {
      accessorKey: "tally_card_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role Name" />,
      cell: ({ row }) => {
        return <div className="font-medium">{row.getValue("tally_card_number")}</div>;
      },
    },
    {
      accessorKey: "item_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role Code" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouses" />,
      cell: ({ row }) => {
        return <div>{row.getValue("warehouse")}</div>;
      },
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
  saveView: true,
  viewStorageKey: "tally-cards-view",
};

export type TallyCardsViewConfig = {
  features: TableFeatures;
  toolbar: typeof tallyCardsToolbar;
  quickFilters: QuickFilter[];
  buildColumns: (includeActions?: boolean) => ColumnDef<TallyCardRow, any>[];
};

export const tallyCardsViewConfig: TallyCardsViewConfig = {
  features,
  toolbar: tallyCardsToolbar,
  quickFilters,
  buildColumns: (includeActions = true) => buildColumns(includeActions),
};
