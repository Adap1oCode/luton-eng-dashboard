// src/components/data-table/data-table-filters.tsx
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter } from "lucide-react";

export type FilterMode = "contains" | "startsWith" | "endsWith" | "equals" | "notEquals";

export type ColumnFilterState = {
  value: string;
  mode: FilterMode;
};

export type FilterColumn = {
  id: string;
  label: string;
  /** Future: "number" | "date" support */
  type?: "string";
  /** Hide input (e.g., for actions/expander columns) */
  disableInput?: boolean;
};

type Props = {
  columns: FilterColumn[];
  // Pixel-based column widths
  columnWidthsPx?: Record<string, number>;
  show?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;

  filters: Record<string, ColumnFilterState>;
  onChange: (columnId: string, next: ColumnFilterState) => void;
};

export function DataTableFilters({
  columns,
  columnWidthsPx,
  show = true,
  search,
  onSearchChange,
  filters,
  onChange,
}: Props) {
  const cols = useMemo(() => columns.filter((c) => !c.disableInput), [columns]);

  if (!show) return null;

  return (
    <tr>
      {/* Leading control col gap if present */}
      {/* Render one filter cell per data column */}
      {columns.map((c) => {
        const state = filters[c.id] ?? { value: "", mode: "contains" as FilterMode };
        return (
          <th
            key={c.id}
            className="bg-muted/50 border border-gray-200 p-3 text-left text-xs dark:border-gray-700"
            style={
              columnWidthsPx?.[c.id]
                ? { width: `${columnWidthsPx[c.id]}px` }
                : undefined
            }
          >
            {c.disableInput ? (
              <div />
            ) : (
              <div className="flex items-center justify-end gap-2">
                <Input
                  placeholder="Filter..."
                  value={state.value}
                  onChange={(e) => onChange(c.id, { ...state, value: e.target.value })}
                  className="h-9 placeholder:font-normal"
                  style={{ width: "calc(100% - 2.75rem)" }}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 px-2 py-1 shrink-0 flex items-center justify-center">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-36 p-1">
                    <div className="space-y-1">
                      {(["contains", "startsWith", "endsWith", "equals", "notEquals"] as FilterMode[]).map((m) => (
                        <Button
                          key={m}
                          variant={state.mode === m ? "default" : "ghost"}
                          size="sm"
                          className="h-7 w-full justify-start text-xs"
                          onClick={() => onChange(c.id, { ...state, mode: m })}
                        >
                          {modeLabel(m)}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </th>
        );
      })}
    </tr>
  );
}

function modeLabel(m: FilterMode) {
  switch (m) {
    case "contains":
      return "Contains";
    case "startsWith":
      return "Starts with";
    case "endsWith":
      return "Ends with";
    case "equals":
      return "Equal to";
    case "notEquals":
      return "Not equal";
  }
}
