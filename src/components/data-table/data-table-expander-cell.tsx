// src/components/data-table/data-table-expander-cell.tsx
"use client";

import * as React from "react";
import type { Table as RTable, Row } from "@tanstack/react-table";
import { ChevronRight, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Header cell for the special "_expander" column:
 * - Select-all for the current page (honors TanStack's page selection helpers)
 * - Shows indeterminate state when some (but not all) page rows are selected
 */
export function ExpanderHeader({ table }: { table: RTable<any> }) {
  const all = table.getIsAllPageRowsSelected();
  const some = table.getIsSomePageRowsSelected();

  const toggleAll = React.useCallback(() => {
    table.toggleAllPageRowsSelected(!all);
  }, [table, all]);

  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleAll();
    }
  };

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleAll();
        }}
        onKeyDown={onKey}
        title={all ? "Unselect all rows on this page" : "Select all rows on this page"}
        aria-label={all ? "Unselect all rows on this page" : "Select all rows on this page"}
        aria-pressed={all || !!some}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded",
          "text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        {all ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <span className="relative inline-flex">
            <Square className={cn("h-4 w-4", some ? "opacity-60" : "")} />
            {some && (
              // a tiny indeterminate bar centered in the square
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-2 -translate-x-1/2 -translate-y-1/2 rounded bg-current" />
            )}
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Body cell for the special "_expander" column:
 * - Chevron to expand/collapse the row
 * - Row selection toggle
 */
export function ExpanderCell({ row }: { row: Row<any> }) {
  const expanded = row.getIsExpanded();
  const selected = row.getIsSelected();

  // Some apps restrict row selection; respect if available
  const canSelect = (row as any).getCanSelect ? (row as any).getCanSelect() : true;

  const toggleExpanded = React.useCallback(() => {
    row.toggleExpanded();
  }, [row]);

  const toggleSelected = React.useCallback(() => {
    if (!canSelect) return;
    row.toggleSelected(!selected);
  }, [row, selected, canSelect]);

  const onKeyExpand = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleExpanded();
    }
  };
  const onKeySelect = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleSelected();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Expand / collapse */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleExpanded();
        }}
        onKeyDown={onKeyExpand}
        title={expanded ? "Collapse row" : "Expand row"}
        aria-label={expanded ? "Collapse row" : "Expand row"}
        aria-expanded={expanded}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded",
          "text-gray-400 transition-transform hover:text-gray-600 dark:text-gray-500",
          expanded && "rotate-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* Row select */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleSelected();
        }}
        onKeyDown={onKeySelect}
        title={selected ? "Unselect row" : "Select row"}
        aria-label={selected ? "Unselect row" : "Select row"}
        aria-pressed={selected}
        disabled={!canSelect}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded",
          "text-gray-400 hover:text-gray-600 dark:text-gray-500",
          !canSelect && "opacity-50 cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        {selected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
      </button>
    </div>
  );
}
