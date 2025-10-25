"use client";

import * as React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface DraggableHeaderCellProps {
  columnId: string;
  label: React.ReactNode;
  sorted: false | "asc" | "desc";
  isReorderable: boolean;
  onToggleSort: () => void;
  onMouseDownResize: (e: React.MouseEvent<HTMLDivElement>, columnId: string) => void;
}

export const DraggableHeaderCell: React.FC<DraggableHeaderCellProps> = ({
  columnId,
  label,
  sorted,
  isReorderable,
  onToggleSort,
  onMouseDownResize,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: columnId });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;

  return (
    <div
      ref={isReorderable ? setNodeRef : undefined}
      style={isReorderable ? style : undefined}
      className="relative space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1">
          <GripVertical
            className="h-4 w-4 cursor-move text-gray-400"
            {...(isReorderable ? attributes : {})}
            {...(isReorderable ? listeners : {})}
          />
          <span className="mr-2 truncate whitespace-nowrap">{label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToggleSort} className="has-[>svg]:px-3">
            {sorted === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : sorted === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {/* Resize handle on the right edge */}
      <div
        className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize select-none"
        onMouseDown={(e) => onMouseDownResize(e as React.MouseEvent<HTMLDivElement>, columnId)}
        data-testid="resize-handle"
      />
    </div>
  );
};

export interface DecoratedHeaderProps {
  column: {
    id: string;
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
  label: React.ReactNode;
  columnOrder: string[];
  onMouseDownResize: (e: React.MouseEvent<HTMLDivElement>, columnId: string) => void;
}

export const DecoratedHeader: React.FC<DecoratedHeaderProps> = ({ column, label, columnOrder, onMouseDownResize }) => {
  const sorted = column.getIsSorted();
  const reorderable = columnOrder.includes(column.id) && column.id !== "actions" && column.id !== "__select";

  return (
    <DraggableHeaderCell
      columnId={column.id}
      label={label}
      sorted={sorted}
      isReorderable={reorderable}
      onToggleSort={() => column.toggleSorting(sorted === "asc")}
      onMouseDownResize={onMouseDownResize}
    />
  );
};
