// src/components/data-table/data-table.tsx
"use client";

import React, { useState, useMemo, useRef } from "react";

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import { GripVertical, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";

import { cn } from "@/lib/utils";

import { DataTableFilters, type FilterColumn, type ColumnFilterState } from "./data-table-filters";
import { useColumnResize } from "./use-column-resize";

// -----------------------------------------------------------------------------
// Legacy interfaces (kept for backwards compatibility)
// -----------------------------------------------------------------------------
interface ColumnDef {
  id: string;
  label: string;
  sortOptions: { label: string; value: "asc" | "desc"; icon: React.ComponentType<{ className?: string }> }[];
  type: "text" | "date" | "status" | "number";
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef[];
  sortConfig: { column: string | null; direction: "asc" | "desc" };
  onSortFromDropdown: (columnId: string, direction: "asc" | "desc") => void;
  showMoreFilters: boolean;
  globalSearch: string;
  columnFilters: Record<string, string>;
  onColumnFilterChange: (columnId: string, value: string) => void;
  visibleColumns: string[];
  columnOrder: string[];
  onColumnOrderChange: (newOrder: string[]) => void;
  columnWidths: Record<string, number>;
  onColumnWidthsChange: (widths: Record<string, number>) => void;
  expandedRows: Set<number>;
  onExpandRow: (index: number) => void;
  renderCell: (item: T, columnId: string) => React.ReactNode;
  renderExpandedContent: (item: T) => React.ReactNode;
  onRowSelect: (selected: number[]) => void;
  selectedRows?: number[];
}

// -----------------------------------------------------------------------------
// TanStack props
// -----------------------------------------------------------------------------
interface TanStackDataTableProps<T = Record<string, unknown>> {
  dndEnabled: boolean;
  table: TanStackTable<T>;
  dataIds: UniqueIdentifier[];
  handleDragEnd: (event: DragEndEvent) => void;
  sensors: SensorDescriptor<SensorOptions>[];
  sortableId: string;
  filters?: Record<string, unknown>;
  renderExpanded?: (row: any) => React.ReactNode;
  columnWidthsPct?: Record<string, number>;
  tableContainerRef?: React.MutableRefObject<HTMLElement | null>;
  filtersConfig?: {
    columns: FilterColumn[];
    columnWidthsPct?: Record<string, number>;
    show?: boolean;
    search?: string;
    onSearchChange?: (v: string) => void;
    filters: Record<string, ColumnFilterState>;
    onChange: (columnId: string, next: ColumnFilterState) => void;
  };
}

function isTanStackProps<T = Record<string, unknown>>(
  props: DataTableProps<Record<string, unknown>> | TanStackDataTableProps<T>,
): props is TanStackDataTableProps<T> {
  return "table" in props && "dndEnabled" in props;
}

// -----------------------------------------------------------------------------
// TanStack React Table component (NO local DndContext; relies on parent)
// -----------------------------------------------------------------------------
function TanStackDataTable<T = Record<string, unknown>>({
  table,
  dataIds,
  renderExpanded,
  columnWidthsPct,
  tableContainerRef,
  filtersConfig,
}: TanStackDataTableProps<T>) {
  return (
    <SortableContext items={dataIds}>
      <div ref={tableContainerRef as any} className="overflow-x-auto" data-testid="data-table">
        {/* table-fixed makes width styles on th/td actually apply; min-w-max allows horizontal growth */}
        <Table className="min-w-max table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    style={
                      columnWidthsPct?.[header.column.id] != null
                        ? {
                            width: `${columnWidthsPct[header.column.id]}%`,
                            maxWidth: `${columnWidthsPct[header.column.id]}%`,
                            // NEW: never let headers collapse below a readable width
                            minWidth: (header.column.columnDef as any)?.meta?.minPx ?? 128,
                          }
                        : { minWidth: (header.column.columnDef as any)?.meta?.minPx ?? 128 }
                    }
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
            {filtersConfig ? (
              <DataTableFilters
                columns={filtersConfig.columns}
                columnWidthsPct={filtersConfig.columnWidthsPct}
                show={filtersConfig.show ?? true}
                search={filtersConfig.search}
                onSearchChange={filtersConfig.onSearchChange}
                filters={filtersConfig.filters}
                onChange={filtersConfig.onChange}
              />
            ) : null}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
<TableCell
   key={cell.id}
   className="p-3"
   style={
     columnWidthsPct?.[cell.column.id] != null
       ? {
           width: `${columnWidthsPct[cell.column.id]}%`,
           maxWidth: `${columnWidthsPct[cell.column.id]}%`,
           // NEW: keep body cells in sync with header min
           minWidth: (cell.column.columnDef as any)?.meta?.minPx ?? 128,
         }
       : { minWidth: (cell.column.columnDef as any)?.meta?.minPx ?? 128 }
   }
 >
                        {/* Pure truncation; no tooltip */}
                        <div className="truncate w-full max-w-full overflow-hidden">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>

                  {renderExpanded ? (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length}>{renderExpanded(row)}</TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SortableContext>
  );
}

// -----------------------------------------------------------------------------
// DraggableRow (legacy path)
// -----------------------------------------------------------------------------
interface DraggableRowProps<T> {
  id: string;
  item: T;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isExpanded: boolean;
  onExpand: () => void;
  columns: string[];
  visibleColumns: string[];
  renderCell: (columnId: string) => React.ReactNode;
  renderExpandedContent: () => React.ReactNode;
  renderActions: () => React.ReactNode;
}

function DraggableRow<T extends Record<string, unknown>>({
  id,
  item,
  index,
  isSelected,
  onSelect,
  isExpanded,
  onExpand,
  columns,
  visibleColumns,
  renderCell,
  renderExpandedContent,
  renderActions,
}: DraggableRowProps<T>) {
  return (
    <>
      <TableRow
        className={cn("border-b border-gray-200 dark:border-gray-700", isSelected && "bg-gray-50 dark:bg-gray-800")}
      >
        <TableCell className="w-10 p-3">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </TableCell>
        <TableCell className="w-10 p-3">
          <button
            onClick={onExpand}
            className={cn(
              "text-gray-400 transition-transform hover:text-gray-600 dark:text-gray-500",
              isExpanded && "rotate-90",
            )}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </TableCell>

        {columns.map((colId) => {
          if (!visibleColumns.includes(colId)) return null;
          return (
            <TableCell key={colId} className="p-3">
              {/* Pure truncation; no tooltip */}
              <div className="truncate w-full max-w-full overflow-hidden">{renderCell(colId)}</div>
            </TableCell>
          );
        })}

        <TableCell className="w-24 p-3">{renderActions()}</TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={columns.length + 3} className="bg-gray-50 p-4 dark:bg-gray-800">
            {renderExpandedContent()}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Legacy custom data table (kept intact for compatibility)
// -----------------------------------------------------------------------------
function LegacyDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  sortConfig,
  onSortFromDropdown,
  showMoreFilters,
  globalSearch,
  columnFilters,
  onColumnFilterChange,
  visibleColumns,
  columnOrder,
  onColumnOrderChange,
  columnWidths,
  expandedRows,
  onExpandRow,
  renderCell,
  renderExpandedContent,
  onRowSelect,
  selectedRows = [],
}: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const { isResizing, onMouseDownResize } = useColumnResize(columnWidths, tableRef);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      onColumnOrderChange(newOrder);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = data;
    if (globalSearch) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((val) =>
          val != null ? val.toString().toLowerCase().includes(globalSearch.toLowerCase()) : false,
        ),
      );
    }
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter((item) => {
          const cellValue = (item as any)[columnId];
          return cellValue != null ? cellValue.toString().toLowerCase().includes(value.toLowerCase()) : false;
        });
      }
    });
    return filtered;
  }, [data, globalSearch, columnFilters]);

  const sortedData = useMemo(() => {
    if (!sortConfig.column) return filteredData;
    return [...filteredData].sort((a, b) => {
      const key = sortConfig.column as keyof T;
      const aValue = a[key];
      const bValue = b[key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === "asc" ? -1 : 1;
      if (bValue == null) return sortConfig.direction === "asc" ? 1 : -1;

      if ((aValue as any) < (bValue as any)) return sortConfig.direction === "asc" ? -1 : 1;
      if ((aValue as any) > (bValue as any)) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const allSelected = selectedRows.length === sortedData.length;

  const toggleAllRows = () => {
    onRowSelect(allSelected ? [] : sortedData.map((_, index) => index));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={columnOrder}>
        <div className="overflow-x-auto" data-testid="data-table">
          <Table ref={tableRef} className="min-w-full table-fixed">
            <colgroup>
              <col style={{ width: "40px" }} /> {/* Checkbox */}
              <col style={{ width: "40px" }} /> {/* Expansion */}
              {columnOrder.map((colId) => (
                <col key={colId} style={{ width: `${columnWidths[colId]}%` }} />
              ))}
              <col style={{ width: "100px" }} /> {/* Actions */}
            </colgroup>

            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableHead className="w-10 p-3">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAllRows} />
                </TableHead>
                <TableHead className="w-10 p-3" />
                {columnOrder.map((colId) => {
                  const column = columns.find((c) => c.id === colId);
                  if (!column || !visibleColumns.includes(colId)) return null;
                  return (
                    <TableHead key={colId} className="relative p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-1">
                          <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
                          <span className="mr-2 truncate">{column.label}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => {
                              const newDirection =
                                sortConfig.column === colId && sortConfig.direction === "asc" ? "desc" : "asc";
                              onSortFromDropdown(colId, newDirection);
                            }}
                            className="flex items-center rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                          >
                            {sortConfig.column === colId ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {!isResizing && (
                        <div
                          className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500"
                          onMouseDown={(e) => onMouseDownResize(e, colId)}
                        />
                      )}
                    </TableHead>
                  );
                })}
                <TableHead className="w-24 p-3">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedData.map((item, index) => (
                <DraggableRow
                  key={index}
                  id={index.toString()}
                  item={item}
                  index={index}
                  isSelected={selectedRows.includes(index)}
                  onSelect={() => {
                    const newSelected = selectedRows.includes(index)
                      ? selectedRows.filter((i) => i !== index)
                      : [...selectedRows, index];
                    onRowSelect(newSelected);
                  }}
                  isExpanded={expandedRows.has(index)}
                  onExpand={() => onExpandRow(index)}
                  columns={columnOrder}
                  visibleColumns={visibleColumns}
                  renderCell={(columnId: string) => renderCell(item, columnId)}
                  renderExpandedContent={() => renderExpandedContent(item)}
                  renderActions={() => <div className="flex justify-center gap-2">{/* actions slot */}</div>}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

// -----------------------------------------------------------------------------
// Main switch
// -----------------------------------------------------------------------------
export function DataTable<T = Record<string, unknown>>(
  props: DataTableProps<Record<string, unknown>> | TanStackDataTableProps<T>,
) {
  if (isTanStackProps(props)) {
    return <TanStackDataTable {...props} />;
  }
  return <LegacyDataTable {...props} />;
}
