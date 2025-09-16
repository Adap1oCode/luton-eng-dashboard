import { DndContext, closestCenter, type UniqueIdentifier, type SensorDescriptor } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DraggableRow } from "./draggable-row";

interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  dataIds?: UniqueIdentifier[];
  dndEnabled?: boolean;
  handleDragEnd?: (event: any) => void;
  sensors?: SensorDescriptor<any>[];
  sortableId?: string;
}

export function DataTable<TData>({
  table,
  dndEnabled = false,
  dataIds = [],
  handleDragEnd,
  sensors,
  sortableId,
  filters,
  setFilters,
}: DataTableProps<TData> & {
  filters?: Record<string, { mode: string; value: string }>;
  setFilters?: React.Dispatch<React.SetStateAction<Record<string, { mode: string; value: string }>>>;
}) {
  const visibleColumnCount = table.getHeaderGroups()?.[0]?.headers?.length ?? 1;

  // filter mode (not used locally) - parent drives actual modes

  // Helper to render filter row inside the table header so it aligns with columns
  const renderFilterHeaderRow = () => {
    if (!filters || !setFilters) return null;
    const headerGroups = (table as any).getHeaderGroups?.() ?? [];
    // use the last header group to map columns (most tables have single group)
    const headers = headerGroups[0]?.headers ?? [];
    return (
      <tr>
        {headers.map((header: any, idx: number) => {
          const col = header.column ?? header;
          const key = col?.columnDef?.accessorKey ?? col?.id ?? header.id;
          const total = headers.length;
          // remove filters for first two columns and the last column: render empty header cell
          if (idx === 0 || idx === 1 || idx === total - 1) return <th key={header.id} className="min-w-0 px-3 py-2" />;
          // empty cell for non-data columns (checkbox, drag handle, actions)
          if (!key) return <th key={header.id} className="min-w-0 px-3 py-2" />;
          const current = filters[key] ?? { mode: "contains", value: "" };
          return (
            <th key={String(key)} className="min-w-0 px-3 py-2 align-top">
              <div className="flex min-w-0 items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <select
                    value={current.mode}
                    onChange={(e) =>
                      setFilters((s) => ({
                        ...s,
                        [key]: { ...(s[key] ?? { mode: "contains", value: "" }), mode: e.target.value },
                      }))
                    }
                    className="box-border h-8 w-full min-w-0 rounded border border-gray-200 bg-white px-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="is">Is</option>
                    <option value="isNot">Is not</option>
                    <option value="contains">Contains</option>
                    <option value="notContains">Does not contain</option>
                    <option value="startsWith">Starts with</option>
                    <option value="endsWith">Ends with</option>
                  </select>
                  <input
                    value={current.value}
                    onChange={(e) =>
                      setFilters((s) => ({
                        ...s,
                        [key]: { ...(s[key] ?? { mode: "contains", value: "" }), value: e.target.value },
                      }))
                    }
                    placeholder="Filter"
                    className="box-border h-8 w-full min-w-0 rounded border border-gray-200 bg-white px-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((s) => {
                      const copy = { ...s };
                      delete copy[key];
                      return copy;
                    })
                  }
                  className="flex h-8 w-8 flex-none items-center justify-center self-center rounded border border-gray-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  ×
                </button>
              </div>
            </th>
          );
        })}
      </tr>
    );
  };

  const tableContent = (
    <Table>
      <TableHeader className="bg-muted sticky top-0 z-10">
        {/* render filter row first so filters appear above column titles */}
        {renderFilterHeaderRow()}
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="**:data-[slot=table-cell]:first:w-8">
        {table.getRowModel().rows.length ? (
          dndEnabled ? (
            <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
              {table.getRowModel().rows.map((row) => (
                <DraggableRow key={row.id} row={row} />
              ))}
            </SortableContext>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )
        ) : (
          <TableRow>
            <TableCell colSpan={visibleColumnCount} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (dndEnabled) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        id={sortableId}
      >
        {tableContent}
      </DndContext>
    );
  }

  return <div className="w-full overflow-hidden">{tableContent}</div>;
}
