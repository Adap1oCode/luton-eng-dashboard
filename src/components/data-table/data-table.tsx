// src/components/data-table/data-table.tsx
"use client";

import { useState, useMemo, useRef } from "react";

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

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";

import { DataTableColumnHeader } from "./data-table-column-header";
import { ExpanderHeader, ExpanderCell } from "./data-table-expander-cell";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

// --- DnD for header reordering ---
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Legacy interface for custom data table
interface ColumnDef {
  id: string;
  label: string;
  sortOptions: { label: string; value: "asc" | "desc"; icon: React.ComponentType<{ className?: string }> }[];
  type: "text" | "date" | "status" | "number";
}

// Legacy props interface
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

// TanStack props interface
interface TanStackDataTableProps {
  dndEnabled: boolean;
  table: TanStackTable<Record<string, unknown>>;
  dataIds: UniqueIdentifier[];
  handleDragEnd: (event: DragEndEvent) => void;
  sensors: SensorDescriptor<SensorOptions>[];
  sortableId: string;
  filters?: Record<string, unknown>;
}

// Type guard to check which props we're dealing with
function isTanStackProps(
  props: DataTableProps<Record<string, unknown>> | TanStackDataTableProps,
): props is TanStackDataTableProps {
  return "table" in props && "dndEnabled" in props;
}

// TanStack React Table component
function TanStackDataTable({ table, dataIds, handleDragEnd, sensors }: TanStackDataTableProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={dataIds}>
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="p-3">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="p-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Legacy custom data table component
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
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const { isResizing, onMouseDownResize } = useColumnResize(columnWidths, tableRef);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (e: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    e.dataTransfer.setData("columnId", columnId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, targetColumnId: string) => {
    const draggedColumnId = e.dataTransfer.getData("columnId");
    if (draggedColumnId !== targetColumnId) {
      const newOrder = arrayMove(
        columnOrder,
        columnOrder.indexOf(draggedColumnId),
        columnOrder.indexOf(targetColumnId),
      );
      onColumnOrderChange(newOrder);
    }
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDragOverColumn(null);
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
          const cellValue = item[columnId];
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

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === "asc" ? -1 : 1;
      if (bValue == null) return sortConfig.direction === "asc" ? 1 : -1;

      // Compare values
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
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
        <div className="overflow-x-auto">
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
                    <TableCell
                      key={cell.id}
                      className={cn(isActions && "sticky right-0 bg-white dark:bg-gray-900")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
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
                  renderActions={() => (
                    <div className="flex justify-center gap-2">{/* Add generic action buttons here */}</div>
                  )}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Main component that handles both legacy and TanStack props
export function DataTable(props: DataTableProps<Record<string, unknown>> | TanStackDataTableProps) {
  if (isTanStackProps(props)) {
    return <TanStackDataTable {...props} />;
  }
  return <LegacyDataTable {...props} />;
}
