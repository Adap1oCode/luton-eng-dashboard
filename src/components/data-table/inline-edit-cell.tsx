import React from "react";

import { Edit, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type InlineEditFieldType = "text" | "select" | "boolean";

export interface InlineEditOption {
  value: string | boolean;
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export interface InlineEditConfig {
  fieldType: InlineEditFieldType;
  options?: InlineEditOption[];
  placeholder?: string;
  validation?: (value: any) => boolean;
  formatDisplay?: (value: any) => React.ReactNode;
  parseValue?: (value: string) => any;
  showBadge?: boolean; // Whether to show badge in display mode
}

interface InlineEditCellProps {
  value: any;
  isEditing: boolean;
  editingValue: any;
  config: InlineEditConfig;
  onEditStart: () => void;
  onEditChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

const getDefaultBadgeVariant = (value: any, options?: InlineEditOption[]) => {
  if (options) {
    const option = options.find((opt) => opt.value === value);
    return option?.variant || "default";
  }

  // Default boolean handling for Active/Inactive
  if (typeof value === "boolean") {
    return value ? "default" : "secondary";
  }

  return "default";
};

const getDefaultBadgeClassName = (value: any, options?: InlineEditOption[]) => {
  if (options) {
    const option = options.find((opt) => opt.value === value);
    return option?.className || "";
  }

  // Default boolean handling for Active/Inactive
  if (typeof value === "boolean") {
    return value ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-gray-500 hover:bg-gray-600 text-white";
  }

  return "";
};

const formatDisplayValue = (value: any, config: InlineEditConfig) => {
  if (config.formatDisplay) {
    return config.formatDisplay(value);
  }

  if (config.fieldType === "boolean") {
    return value ? "Active" : "Inactive";
  }

  if (config.fieldType === "select" && config.options) {
    const option = config.options.find((opt) => opt.value === value);
    return option?.label || String(value);
  }

  return String(value || "");
};

export const InlineEditCell: React.FC<InlineEditCellProps> = ({
  value,
  isEditing,
  editingValue,
  config,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
  disabled = false,
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {config.fieldType === "text" && (
          <Input
            value={editingValue || ""}
            onChange={(e) => onEditChange(config.parseValue ? config.parseValue(e.target.value) : e.target.value)}
            placeholder={config.placeholder}
            className="w-48"
          />
        )}

        {(config.fieldType === "select" || config.fieldType === "boolean") && config.options && (
          <Select
            value={String(editingValue)}
            onValueChange={(val) => {
              const parsedValue = config.fieldType === "boolean" ? val === "true" : val;
              onEditChange(config.parseValue ? config.parseValue(val) : parsedValue);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.options.map((option) => (
                <SelectItem key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button size="sm" onClick={onSave} className="h-8 w-8 p-0">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const displayValue = formatDisplayValue(value, config);
  const badgeVariant = getDefaultBadgeVariant(value, config.options);
  const badgeClassName = getDefaultBadgeClassName(value, config.options);

  return (
    <div className="group flex items-center justify-start gap-2">
      {config.showBadge !== false ? (
        <Badge variant={badgeVariant} className={`px-2 py-1 text-xs ${badgeClassName}`}>
          {displayValue}
        </Badge>
      ) : (
        <span>{displayValue}</span>
      )}
      {!disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditStart}
          className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Edit className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
