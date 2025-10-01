// src/components/data-table/data-table-toolbar.tsx
"use client";

import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Filter, Save, SortAsc } from "lucide-react";

type Props = {
  onNew?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onClearSorting?: () => void;
  onExportCSV?: () => void;

  disableBulk?: boolean;
  hasSorting?: boolean;
  hasFiltersApplied?: boolean;

  /** Right aligned custom content (e.g., Save View button, Views dropdown) */
  rightSlot?: ReactNode;
  /** Middle slot (e.g., badges & indicators) */
  middleSlot?: ReactNode;
  /** Left slot (override entire left controls if provided) */
  leftSlot?: ReactNode;
};

export function DataTableToolbar({
  onNew,
  onDeleteSelected,
  onDuplicateSelected,
  onClearSorting,
  onExportCSV,
  disableBulk,
  hasSorting,
  hasFiltersApplied,
  rightSlot,
  middleSlot,
  leftSlot,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {leftSlot ? (
            leftSlot
          ) : (
            <>
              {onNew && (
                <Button onClick={onNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  + New
                </Button>
              )}
              {onDeleteSelected && (
                <Button variant="destructive" onClick={onDeleteSelected} disabled={disableBulk}>
                  Delete
                </Button>
              )}
              {onDuplicateSelected && (
                <Button variant="outline" onClick={onDuplicateSelected} disabled={disableBulk}>
                  Duplicate
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {middleSlot}
          {hasSorting && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100">
              <SortAsc className="mr-1 h-3 w-3" />
              Sorting Applied
            </Badge>
          )}
          {hasFiltersApplied && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100">
              <Filter className="mr-1 h-3 w-3" />
              Filter/Sorting Applied
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onClearSorting && (
            <Button variant="outline" onClick={onClearSorting}>
              Clear Sorting
            </Button>
          )}
          {onExportCSV && (
            <Button
              variant="outline"
              onClick={onExportCSV}
              className="bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
