import React from "react";

import { Square, CheckSquare } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TableHeaderProps {
  isAllSelected: boolean;
  onSelectAll: () => void;
  children: React.ReactNode;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ isAllSelected, onSelectAll, children }) => {
  return (
    <thead className="bg-muted/50 border border-gray-200 text-sm dark:border-gray-500">
      <tr>
        <th className="w-16 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSelectAll}
            className="text-muted-foreground hover:text-foreground"
          >
            {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </Button>
        </th>
        {children}
      </tr>
    </thead>
  );
};
