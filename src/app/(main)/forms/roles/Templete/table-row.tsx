import React from "react";

import { ChevronRight, Square, CheckSquare } from "lucide-react";

interface TableRowProps {
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

export const TableRow: React.FC<TableRowProps> = ({ isSelected, isExpanded, onSelect, onToggleExpand, children }) => {
  return (
    <tr
      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        isSelected ? "bg-gray-50 dark:bg-gray-800" : ""
      }`}
    >
      <td className="p-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpand}
            className={`text-gray-400 transition-transform hover:text-gray-600 dark:text-gray-500 ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <button onClick={onSelect}>
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </td>
      {children}
    </tr>
  );
};
