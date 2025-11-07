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

// Check if value is null or empty (for showing NONE badge)
const isValueEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === "" || (typeof value === "number" && isNaN(value));
};

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

const getDefaultBadgeClassName = (value: any, options?: InlineEditOption[], config?: InlineEditConfig) => {
  // Check if value is null/empty - show red NONE badge
  if (isValueEmpty(value) && config?.fieldType === "text") {
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800";
  }

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
  const isEmpty = isValueEmpty(value);
  const displayValue = isEmpty && config.fieldType === "text" ? "NONE" : formatDisplayValue(value, config);
  const badgeVariant = getDefaultBadgeVariant(value, config.options);
  const badgeClassName = getDefaultBadgeClassName(value, config.options, config);

  // ROBUST SOLUTION: Side-by-side pattern
  // - Keep display value visible (read-only) when editing
  // - Show empty input next to it that gets focus
  // - Input never unmounts, so no focus issues
  // - Clear UX: user sees old value + new value being typed

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full min-w-0">
        {/* Display the current value (read-only) - user can see what they're changing */}
        <span className="text-muted-foreground text-sm flex-shrink-0">
          {config.showBadge !== false ? (
            <Badge variant={badgeVariant} className={`px-2 py-1 text-xs ${badgeClassName}`}>
              {displayValue}
            </Badge>
          ) : (
            displayValue
          )}
        </span>

        {/* Input for new value - starts empty, auto-focuses, never unmounts */}
        {config.fieldType === "text" && (
          <Input
            autoFocus
            value={editingValue || ""}
            onChange={(e) => {
              onEditChange(config.parseValue ? config.parseValue(e.target.value) : e.target.value);
            }}
            placeholder={config.placeholder || "Enter new value"}
            className="flex-1 min-w-0 border-[1px] shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSave();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
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
            <SelectTrigger className="flex-1 min-w-0">
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

        <Button size="sm" onClick={onSave} className="h-8 w-8 p-0 flex-shrink-0">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 w-8 p-0 flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Display mode - not editing
  // Show badge if: value is empty (NONE badge) OR config.showBadge is true
  const shouldShowBadge = isEmpty || config.showBadge !== false;
  
  return (
    <div className="group flex items-center justify-start gap-2">
      {shouldShowBadge ? (
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
