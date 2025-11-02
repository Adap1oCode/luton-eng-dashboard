"use client";

import { Column } from "@tanstack/react-table";
import { GripVertical, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const isSorted = column.getIsSorted();
            const icon =
              isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-2.5 w-2.5" />
              ) : isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-2.5 w-2.5" />
              ) : (
                <ArrowUpDown className="ml-2 h-2.5 w-2.5" />
              );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1">
          {/* purely visual grip for Roles parity */}
          <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
          <span className={cn("mr-2 truncate", isSorted && "font-semibold text-blue-600")}>{title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Outline button look from Roles - highlight when sorted */}
              <Button 
                variant="outline" 
                className={cn(
                  "flex items-center has-[>svg]:px-3 h-8 rounded-md gap-1.5 px-3",
                  isSorted && "border-blue-500 bg-blue-50 text-blue-700"
                )}
              >
                {icon}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUp className="mr-2 h-2.5 w-2.5 text-muted-foreground/70" />
              Asc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDown className="mr-2 h-2.5 w-2.5 text-muted-foreground/70" />
                Desc
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
