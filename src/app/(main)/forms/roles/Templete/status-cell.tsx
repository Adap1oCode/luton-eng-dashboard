import React from "react";

import { Edit, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatusCellProps {
  status: string;
  isEditing: boolean;
  editingStatus: string;
  statusOptions: string[];
  onEditStart: () => void;
  onEditChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "Active":
      return "default";
    case "Inactive":
      return "secondary";
    default:
      return "outline";
  }
};

export const StatusCell: React.FC<StatusCellProps> = ({
  status,
  isEditing,
  editingStatus,
  statusOptions,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Select value={editingStatus} onValueChange={onEditChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onSave} className="h-8 w-8 p-0">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-start gap-2">
      <Badge variant={getStatusBadgeVariant(status)} className="px-2 py-1 text-xs">
        {status}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEditStart}
        className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
};
