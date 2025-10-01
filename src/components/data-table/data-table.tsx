"use client";

import { useState, useMemo, useRef } from "react";

import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DraggableRow } from "./draggable-row";
import { useColumnResize } from "./use-column-resize";

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
  selectedRows?: number[]; // Make optional to handle undefined cases
}

export function DataTable<T extends Record<string, unknown>>({
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
  onColumnWidthsChange,
  expandedRows,
  onExpandRow,
  renderCell,
  renderExpandedContent,
  onRowSelect,
  selectedRows = [], // Default to empty array
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

  const handleDragLeave = (e: React.DragEvent<HTMLTableCellElement>) => {
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
    let filtered = data || [];
    if (globalSearch) {
      filtered = filtered.filter((item) =>
        Object.values(item || {}).some((val) =>
          val != null ? val.toString().toLowerCase().includes(globalSearch.toLowerCase()) : false,
        ),
      );
    }
    if (columnFilters && typeof columnFilters === "object") {
      Object.entries(columnFilters).forEach(([columnId, value]) => {
        if (value) {
          filtered = filtered.filter((item) => {
            const cellValue = item[columnId];
            return cellValue != null ? cellValue.toString().toLowerCase().includes(value.toLowerCase()) : false;
          });
        }
      });
    }
    return filtered;
  }, [data, globalSearch, columnFilters]);

  const sortedData = useMemo(() => {
    if (!sortConfig?.column) return filteredData;
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

  const allSelected = (selectedRows?.length ?? 0) === (sortedData?.length ?? 0);

  const toggleAllRows = () => {
    if (!sortedData) return; // تجنب الخطأ إذا كانت البيانات غير معرفة
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
                    <DataTableColumnHeader
                      key={colId}
                      columnId={colId}
                      label={column.label}
                      sortOptions={column.sortOptions}
                      sortConfig={sortConfig}
                      onSortFromDropdown={onSortFromDropdown}
                      showMoreFilters={showMoreFilters}
                      searchTerm={columnFilters[colId] || ""}
                      onSearchChange={(value: string) => onColumnFilterChange(colId, value)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      dragOverColumn={dragOverColumn}
                      onResizeStart={onMouseDownResize}
                      columnWidth={columnWidths[colId]}
                      isResizing={isResizing}
                    />
                  );
                })}
                <TableHead className="w-[100px] p-3 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData?.map((item, index) => (
                <DraggableRow
                  key={index}
                  id={index.toString()}
                  item={item}
                  index={index}
                  isSelected={(selectedRows ?? []).includes(index)}
                  onSelect={() => {
                    const currentSelected = selectedRows ?? [];
                    const newSelected = currentSelected.includes(index)
                      ? currentSelected.filter((i) => i !== index)
                      : [...currentSelected, index];
                    onRowSelect(newSelected);
                  }}
                  isExpanded={expandedRows?.has(index) ?? false}
                  onExpand={() => onExpandRow(index)}
                  columns={columnOrder ?? []}
                  visibleColumns={visibleColumns ?? []}
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
