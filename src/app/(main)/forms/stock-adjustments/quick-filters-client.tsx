"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { QuickFilter } from "./view.config";
import { quickFilters } from "./view.config";

interface QuickFiltersClientProps {
  onFilterChange?: (filterId: string, value: string) => void;
}

export function QuickFiltersClient({ onFilterChange }: QuickFiltersClientProps) {
  const [selectedValues, setSelectedValues] = React.useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    quickFilters.forEach((filter) => {
      defaults[filter.id] = filter.defaultValue ?? "";
    });
    return defaults;
  });

  const handleValueChange = (filterId: string, value: string) => {
    setSelectedValues((prev) => ({ ...prev, [filterId]: value }));
    onFilterChange?.(filterId, value);
  };

  return (
    <div className="flex items-center gap-4">
      {quickFilters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-2">
          <Label htmlFor={`quick-filter-${filter.id}`} className="text-sm font-medium">
            {filter.label}:
          </Label>
          <Select
            value={selectedValues[filter.id] ?? filter.defaultValue}
            onValueChange={(value) => handleValueChange(filter.id, value)}
          >
            <SelectTrigger id={`quick-filter-${filter.id}`} className="w-[180px]">
              <SelectValue placeholder={`Select ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
