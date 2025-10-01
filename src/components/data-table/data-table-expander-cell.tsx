// src/components/data-table/data-table-expander-cell.tsx
"use client";

import { ChevronRight, CheckSquare, Square } from "lucide-react";

type Props = {
  isExpanded: boolean;
  onToggleExpand: () => void;

  isSelected: boolean;
  isIndeterminate?: boolean;
  onToggleSelected: () => void;
};

export function DataTableExpanderCell({
  isExpanded,
  onToggleExpand,
  isSelected,
  isIndeterminate,
  onToggleSelected,
}: Props) {
  return (
    <td className="w-16 p-2">
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Collapse row" : "Expand row"}
          className={[
            "text-gray-400 transition-transform hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100",
            isExpanded ? "rotate-90" : "",
          ].join(" ")}
        >
          <ChevronRight className="h-3 w-3" />
        </button>
        <button
          onClick={onToggleSelected}
          aria-label={isSelected ? "Unselect row" : "Select row"}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-blue-600" />
          ) : isIndeterminate ? (
            // Fallback visual: outlined square (you can replace with a minus-box if you prefer)
            <Square className="h-4 w-4 opacity-60" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
      </div>
    </td>
  );
}
