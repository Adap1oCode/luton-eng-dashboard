import React from "react";

import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SaveViewDialogProps {
  open: boolean;
  viewName: string;
  viewDescription: string;
  visibleColumnsCount: number;
  sortingInfo: string;
  columnOrderCount: number;
  onOpenChange: (open: boolean) => void;
  onViewNameChange: (value: string) => void;
  onViewDescriptionChange: (value: string) => void;
  onSave: () => void;
}

export const SaveViewDialog: React.FC<SaveViewDialogProps> = ({
  open,
  viewName,
  viewDescription,
  visibleColumnsCount,
  sortingInfo,
  columnOrderCount,
  onOpenChange,
  onViewNameChange,
  onViewDescriptionChange,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Current View</DialogTitle>
          <DialogDescription>
            Save your current column layout, sorting, and visibility settings as a named view for quick access later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="view-name">View Name *</Label>
            <Input
              id="view-name"
              placeholder="e.g., My Custom View, Status Overview, etc."
              value={viewName}
              onChange={(e) => onViewNameChange(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="view-description">Description</Label>
            <Input
              id="view-description"
              placeholder="Brief description of this view..."
              value={viewDescription}
              onChange={(e) => onViewDescriptionChange(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            <div className="font-medium">Current Settings:</div>
            <div className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>• {visibleColumnsCount} columns visible</div>
              <div>• {sortingInfo}</div>
              <div>• Column order: {columnOrderCount} columns</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!viewName.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
