import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { CellViewer } from '@/components/data-table/cell-viewer'

export type Requisition = {
  order_number: string
  created_by: string
  status: string
  order_date: string | null
  due_date: string | null
  total: number
  project_number: string | null
}

export const columns: ColumnDef<Requisition>[] = [
  {
    accessorKey: 'order_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order No" />
    ),
    cell: ({ row }) => <CellViewer value={row.original.order_number} />,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'created_by',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => <CellViewer value={row.original.created_by} />,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.status || '—'}</Badge>
    ),
  },
  {
    accessorKey: 'order_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Date" />
    ),
    cell: ({ row }) =>
      row.original.order_date
        ? format(new Date(row.original.order_date), 'dd MMM yyyy')
        : '—',
  },
  {
    accessorKey: 'due_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Due Date" />
    ),
    cell: ({ row }) =>
      row.original.due_date
        ? format(new Date(row.original.due_date), 'dd MMM yyyy')
        : '—',
  },
  {
    accessorKey: 'total',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => <CellViewer value={row.original.total} />,
  },
]
