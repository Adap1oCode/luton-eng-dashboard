"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { QuickFilter } from "./view.config";
import { quickFilters } from "./view.config";

interface QuickFiltersClientProps {
  onFilterChange?: (newFilters: Record<string, string>) => void;
  currentFilters?: Record<string, string>;
}

export function QuickFiltersClient({ onFilterChange, currentFilters }: QuickFiltersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedValues, setSelectedValues] = React.useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    quickFilters.forEach((filter) => {
      // Get value from URL params or use default
      const urlValue = searchParams.get(filter.id);
      defaults[filter.id] = urlValue ?? filter.defaultValue ?? "";
    });
    return defaults;
  });

  const handleValueChange = (filterId: string, value: string) => {
    setSelectedValues((prev) => ({ ...prev, [filterId]: value }));
    
    // Call the callback if provided with the new filter state
    if (onFilterChange) {
      const newFilters = { ...selectedValues, [filterId]: value };
      onFilterChange(newFilters);
    }
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
