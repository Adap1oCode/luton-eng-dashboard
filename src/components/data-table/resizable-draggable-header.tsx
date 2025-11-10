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
  showSortButton?: boolean;
}

export const DraggableHeaderCell: React.FC<DraggableHeaderCellProps> = ({
  columnId,
  label,
  sorted,
  isReorderable,
  onToggleSort,
  showSortButton = true,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: columnId });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;

  return (
    <div
      ref={isReorderable ? setNodeRef : undefined}
      style={isReorderable ? style : undefined}
      className="relative"
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
        {showSortButton ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" onClick={onToggleSort} className="h-6 px-2 py-1 flex items-center justify-center">
              {sorted === "asc" ? (
                <ArrowUp className="h-2 w-2" />
              ) : sorted === "desc" ? (
                <ArrowDown className="h-2 w-2" />
              ) : (
                <ArrowUpDown className="h-2 w-2" />
              )}
            </Button>
          </div>
        ) : null}
      </div>
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
  showSortButton?: boolean;
}

export const DecoratedHeader: React.FC<DecoratedHeaderProps> = ({ column, label, columnOrder, showSortButton = true }) => {
  const sorted = column.getIsSorted();
  const reorderable = columnOrder.includes(column.id) && column.id !== "actions" && column.id !== "__select";

  return (
    <DraggableHeaderCell
      columnId={column.id}
      label={label}
      sorted={sorted}
      isReorderable={reorderable}
      onToggleSort={() => column.toggleSorting(sorted === "asc")}
      showSortButton={showSortButton}
    />
  );
};
