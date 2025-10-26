import React from "react";

import { Eye, Check, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SavedView {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  columnOrder: string[];
  visibleColumns: Record<string, boolean>;
  sortConfig: {
    column: string | null;
    direction: string;
    type?: "alphabetical" | "date" | "status";
  };
  createdAt: Date;
}

interface ViewsMenuProps {
  views: SavedView[];
  currentViewId: string;
  onApplyView: (view: SavedView) => void;
  onDeleteView: (viewId: string) => void;
  formatDate: (date: Date) => string;
}

export const ViewsMenu: React.FC<ViewsMenuProps> = ({
  views,
  currentViewId,
  onApplyView,
  onDeleteView,
  formatDate,
}) => {
  return (
    <div>
      <div className="max-h-64 space-y-1 overflow-y-auto p-1">
        {views.map((view) => (
          <div
            key={view.id}
            className={`flex items-center justify-between rounded-sm px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              currentViewId === view.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-gray-400" />
                <span className="truncate text-sm font-medium">{view.name}</span>
                {view.isDefault && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground mt-1 truncate text-xs">{view.description}</div>
              <div className="text-muted-foreground mt-1 text-xs">{formatDate(view.createdAt)}</div>
            </div>
            <div className="ml-2 flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => onApplyView(view)} className="h-7 w-7 p-0">
                <Check className="h-3.5 w-3.5" />
              </Button>
              {!view.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteView(view.id)}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground p-2 text-xs">
        {views.length} saved view{views.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};
