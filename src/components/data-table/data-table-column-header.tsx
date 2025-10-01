"use client";

import { GripVertical, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DataTableColumnHeaderProps {
  columnId: string;
  label: string;
  sortOptions: { label: string; value: "asc" | "desc"; icon: React.ComponentType<{ className?: string }> }[];
  sortConfig: { column: string | null; direction: "asc" | "desc" } | null;
  onSortFromDropdown: (columnId: string, direction: "asc" | "desc") => void;
  showMoreFilters: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDragStart: (e: React.DragEvent<HTMLTableCellElement>, columnId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLTableCellElement>, columnId: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLTableCellElement>) => void;
  onDrop: (e: React.DragEvent<HTMLTableCellElement>, targetColumnId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLTableCellElement>) => void;
  dragOverColumn: string | null;
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>, columnId: string) => void;
  columnWidth: number;
  isResizing: boolean;
}

export function DataTableColumnHeader({
  columnId,
  label,
  sortOptions,
  sortConfig,
  onSortFromDropdown,
  showMoreFilters,
  searchTerm,
  onSearchChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  dragOverColumn,
  onResizeStart,
  columnWidth,
  isResizing,
}: DataTableColumnHeaderProps) {
  const getSortIcon = () => {
    if (sortConfig?.column !== columnId) return <ArrowUpDown className="h-3 w-3" />;
    return sortConfig?.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={`text-muted-foreground relative min-w-[120px] overflow-hidden p-3 pr-4 text-left text-xs font-medium tracking-wider whitespace-nowrap uppercase ${
        dragOverColumn === columnId ? "bg-blue-100 dark:bg-blue-900" : ""
      } ${sortConfig?.column === columnId ? "bg-muted/70" : ""} border border-gray-200 dark:border-gray-700`}
      draggable={!isResizing}
      onDragStart={(e) => onDragStart(e, columnId)}
      onDragOver={(e) => onDragOver(e, columnId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, columnId)}
      onDragEnd={onDragEnd}
      style={{ width: `${columnWidth}%` }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-1">
            <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
            <span className="mr-2 truncate">{label}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  {getSortIcon()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={`flex items-center gap-2 p-2 text-xs ${
                      sortConfig?.column === columnId && sortConfig?.direction === option.value
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                        : ""
                    }`}
                    onClick={() => onSortFromDropdown(columnId, option.value)}
                  >
                    <option.icon className="h-2 w-2" />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {showMoreFilters && (
          <div className="justify-left flex gap-2">
            <Input
              placeholder="Filter..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-full text-xs"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-10 px-2 text-xs">
                  <Filter className="mr-1 h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-1">
                <div className="space-y-1">
                  <Button variant="default" size="sm" className="h-7 w-full justify-start text-xs">
                    Contains
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                    Starts with
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                    Ends with
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                    Equal to
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs">
                    Not equal
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
      <div
        className="absolute top-0 right-0 z-20 h-full w-3 cursor-col-resize bg-transparent transition-colors hover:bg-blue-300"
        onMouseDown={(e) => onResizeStart(e, columnId)}
      />
    </th>
  );
}
