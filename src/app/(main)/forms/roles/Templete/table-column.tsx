import React from "react";

import { GripVertical, ArrowUp, ArrowDown, ArrowUpDown, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SortOption {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TableColumnProps {
  id: string;
  label: string;
  width: number;
  sortConfig: { column: string | null; direction: string };
  sortOptions: SortOption[];
  showMoreFilters: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSort: (direction: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  isDragOver: boolean;
  isLastColumn: boolean;
}

export const TableColumn: React.FC<TableColumnProps> = ({
  id,
  label,
  width,
  sortConfig,
  sortOptions,
  showMoreFilters,
  searchTerm,
  onSearchChange,
  onSort,
  onDragStart,
  onDragOver,
  onDrop,
  onResizeStart,
  isDragOver,
  isLastColumn,
}) => {
  const getSortIcon = () => {
    if (sortConfig.column !== id) return <ArrowUpDown className="h-3 w-3" />;
    if (sortConfig.direction === "asc") return <ArrowUp className="h-3 w-3" />;
    if (sortConfig.direction === "desc") return <ArrowDown className="h-3 w-3" />;
    return <ArrowUpDown className="h-3 w-3" />;
  };

  return (
    <th
      style={{ width: `${width}%` }}
      className={`text-muted-foreground relative overflow-hidden p-3 pr-4 text-left text-xs font-medium tracking-wider whitespace-nowrap ${
        isDragOver ? "bg-blue-100 dark:bg-blue-900" : ""
      } ${sortConfig.column === id ? "bg-muted/70" : ""} border border-gray-200 dark:border-gray-700`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
                <DropdownMenuLabel className="py-.5 text-xs font-semibold">Sort {label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={`flex items-center gap-2 p-2 text-xs ${
                      sortConfig.column === id && sortConfig.direction === option.value
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                        : ""
                    }`}
                    onClick={() => onSort(option.value)}
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

      {!isLastColumn && (
        <div
          className="absolute top-0 right-0 z-20 h-full w-3 cursor-col-resize bg-transparent transition-colors hover:bg-blue-300"
          onMouseDown={onResizeStart}
        />
      )}
    </th>
  );
};
