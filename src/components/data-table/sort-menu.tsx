import React from "react";

import { Button } from "@/components/ui/button";

type SortDirection = "asc" | "desc" | "none";

interface SortOption {
  label: string;
  value: SortDirection;
  icon: React.ComponentType<{ className?: string }>;
}

interface Column {
  id: string;
  label: string;
  sortOptions: SortOption[];
}

interface SortMenuProps {
  columns: Column[];
  sortConfig: { column: string | null; direction: SortDirection };
  onSort: (columnId: string, direction: SortDirection) => void;
  onClearAll: () => void;
}

export const SortMenu: React.FC<SortMenuProps> = ({ columns, sortConfig, onSort, onClearAll }) => {
  return (
    <div>
      <div className="max-h-64 space-y-2 overflow-y-auto p-1">
        {columns.map((column) => (
          <div key={column.id} className="space-y-1">
            <div className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400">{column.label}</div>
            <div className="grid grid-cols-1 gap-0.5">
              {column.sortOptions.map((option) => (
                <button
                  key={`${column.id}-${option.value}`}
                  className={`flex items-center gap-2 rounded p-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    sortConfig.column === column.id && sortConfig.direction === option.value
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                      : ""
                  }`}
                  onClick={() => onSort(column.id, option.value)}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onClearAll}
          className="h-7 w-full text-xs"
          disabled={!sortConfig.column}
        >
          Clear All Sorting
        </Button>
      </div>
    </div>
  );
};
