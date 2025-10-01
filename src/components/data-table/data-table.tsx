"use client";

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

  // existing filter state (parent-driven)
  filters?: Record<string, { mode: string; value: string }>;
  setFilters?: React.Dispatch<React.SetStateAction<Record<string, { mode: string; value: string }>>>;

  // NEW: optional controls for the filter row (all default to current behaviour)
  filterRowEnabled?: boolean;
  filterSkip?: { first?: number; last?: number; indices?: number[] };
  filterOnlyIds?: string[];
  renderFilterControls?: (args: {
    columnKey: string;
    current: { mode: string; value: string };
    setFilters: React.Dispatch<React.SetStateAction<Record<string, { mode: string; value: string }>>>;
  }) => React.ReactNode;
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

  filterRowEnabled,
  filterSkip,
  filterOnlyIds,
  renderFilterControls,
}: DataTableProps<TData>) {
  // Leaf headers (last group)
  const headerGroups = table.getHeaderGroups?.() ?? [];
  const leafHeaders = headerGroups[headerGroups.length - 1]?.headers ?? [];
  const visibleColumnCount = leafHeaders.length || 1;

  // Show filter row? (auto if prop not set)
  const showFilterRow =
    typeof filterRowEnabled === "boolean" ? filterRowEnabled : Boolean(filters && setFilters);

  // Defaults that match your previous behaviour
  const defaultSkip = { first: 2, last: 1, indices: [] as number[] };
  const skip = { ...defaultSkip, ...(filterSkip ?? {}) };

  const shouldRenderFilter = (idx: number, key: string | undefined) => {
    if (!key) return false;

    if (Array.isArray(filterOnlyIds) && filterOnlyIds.length > 0) {
      return filterOnlyIds.includes(key);
    }

    const total = leafHeaders.length;
    if (skip.first && idx < skip.first) return false;
    if (skip.last && idx >= total - skip.last) return false;
    if (skip.indices && skip.indices.includes(idx)) return false;

    return true;
  };

  const DefaultFilterControls = ({
    columnKey,
    current,
    setFilters: set,
  }: {
    columnKey: string;
    current: { mode: string; value: string };
    setFilters: React.Dispatch<
      React.SetStateAction<Record<string, { mode: string; value: string }>>
    >;
  }) => (
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <select
          value={current.mode}
          onChange={(e) =>
            set((s) => ({
              ...s,
              [columnKey]: { ...(s[columnKey] ?? { mode: "contains", value: "" }), mode: e.target.value },
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
            set((s) => ({
              ...s,
              [columnKey]: { ...(s[columnKey] ?? { mode: "contains", value: "" }), value: e.target.value },
            }))
          }
          placeholder="Filter"
          className="box-border h-8 w-full min-w-0 rounded border border-gray-200 bg-white px-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
      <button
        type="button"
        onClick={() =>
          set((s) => {
            const copy = { ...s };
            delete copy[columnKey];
            return copy;
          })
        }
        className="flex h-8 w-8 flex-none items-center justify-center self-center rounded border border-gray-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        aria-label="Clear column filter"
        title="Clear"
      >
        ×
      </button>
    </div>
  );

  const renderFilterHeaderRow = () => {
    if (!showFilterRow || !filters || !setFilters) return null;

    return (
      <tr>
        {leafHeaders.map((header: any, idx: number) => {
          const col = header.column ?? header;
          const keyMaybe: string | undefined =
            col?.columnDef?.accessorKey ?? col?.id ?? header.id;

          // If no key or not eligible, render empty header cell
          if (!shouldRenderFilter(idx, keyMaybe)) {
            return <th key={header.id} className="min-w-0 px-3 py-2" />;
          }

          // From here, we assert a definite string key for TS
          const columnKey = keyMaybe as string;
          const current = filters[columnKey] ?? { mode: "contains", value: "" };

          return (
            <th key={columnKey} className="min-w-0 px-3 py-2 align-top">
              {renderFilterControls ? (
                renderFilterControls({ columnKey, current, setFilters })
              ) : (
                <DefaultFilterControls columnKey={columnKey} current={current} setFilters={setFilters} />
              )}
            </th>
          );
        })}
      </tr>
    );
  };

  const tableContent = (
    <Table>
      <TableHeader className="bg-muted sticky top-0 z-10">
        {/* Filter row above column titles */}
        {renderFilterHeaderRow()}

        {headerGroups.map((headerGroup) => (
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
