// src/app/(main)/dashboard/requisitions/_components/columns.tsx

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { DataTableColumnHeader } from "../../../../../components/data-table/data-table-column-header";

export const dashboardColumns: ColumnDef<any>[] = [
  {
    accessorKey: "order_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order Date" />,
    cell: ({ row }) => row.original.order_date ? format(new Date(row.original.order_date), "dd/MM/yyyy") : "-",
    enableSorting: true,
  },
  {
    accessorKey: "requisition_order_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Requisition No" />,
    cell: ({ row }) => row.original.requisition_order_number || "-",
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => row.original.status || "-",
    enableSorting: true,
  },
  {
    accessorKey: "due_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
    cell: ({ row }) => row.original.due_date ? format(new Date(row.original.due_date), "dd/MM/yyyy") : "-",
    enableSorting: true,
  },
  {
    accessorKey: "warehouse",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
    cell: ({ row }) => row.original.warehouse || "-",
    enableSorting: true,
  },
  {
    accessorKey: "created_by",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created By" />,
    cell: ({ row }) => row.original.created_by || "-",
    enableSorting: true,
  },
  {
    accessorKey: "project_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Project Number" />,
    cell: ({ row }) => row.original.project_number || "-",
    enableSorting: true,
  },
];
