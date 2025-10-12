import React from "react";

import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Column {
  id: string;
  label: string;
  required?: boolean;
}

interface ColumnsMenuProps {
  columns: Column[];
  visibleColumns: Record<string, boolean>;
  displayColumnsCount: number;
  isResizing: boolean;
  onColumnToggle: (columnId: string, visible: boolean) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onResetOrder: () => void;
  onDragStart: (e: React.DragEvent, columnId: string) => void;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
}

export const ColumnsMenu: React.FC<ColumnsMenuProps> = ({
  columns,
  visibleColumns,
  displayColumnsCount,
  isResizing,
  onColumnToggle,
  onShowAll,
  onHideAll,
  onResetOrder,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div>
      <div className="grid grid-cols-3 gap-1 p-2">
        <Button variant="outline" size="sm" onClick={onShowAll} className="h-7 w-full text-xs">
          Show All
        </Button>
        <Button variant="outline" size="sm" onClick={onHideAll} className="h-7 w-full text-xs">
          Hide All
        </Button>
        <Button variant="outline" size="sm" onClick={onResetOrder} className="h-7 w-full text-xs">
          Reset Order
        </Button>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto p-1">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
            draggable={!isResizing}
            onDragStart={(e) => {
              if (isResizing) return;
              onDragStart(e, column.id);
            }}
            onDragOver={(e) => {
              if (isResizing) return;
              onDragOver(e, column.id);
            }}
            onDrop={(e) => {
              if (isResizing) return;
              onDrop(e, column.id);
            }}
          >
            <GripVertical className="h-3.5 w-3.5 cursor-move text-gray-400" />
            <Checkbox
              id={`column-${column.id}`}
              checked={visibleColumns[column.id]}
              onCheckedChange={(checked: boolean) => onColumnToggle(column.id, checked)}
              disabled={column.required}
              className="h-4 w-4"
            />
            <label
              htmlFor={`column-${column.id}`}
              className={`flex-1 cursor-pointer text-sm ${column.required ? "text-muted-foreground" : ""}`}
            >
              {column.label}
              {column.required && <span className="text-muted-foreground ml-1 text-xs">(Required)</span>}
            </label>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground p-2 text-xs">
        {displayColumnsCount} of {columns.length} columns visible
      </div>
    </div>
  );
};
