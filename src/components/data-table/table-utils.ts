import type { ColumnDef } from "@tanstack/react-table";

import { dragColumn } from "./drag-column";

export function withDndColumn<T>(columns: ColumnDef<T>[]): ColumnDef<T>[] {
  return [dragColumn as ColumnDef<T>, ...columns];
}

// src/components/data-table/table-utils.ts

export type FilterMode = "contains" | "startsWith" | "endsWith" | "equals" | "notEquals";

/**
 * Run a string predicate check
 */
export function stringPredicate(value: string, needle: string, mode: FilterMode): boolean {
  const v = (value ?? "").toLocaleLowerCase();
  const n = (needle ?? "").toLocaleLowerCase();
  switch (mode) {
    case "contains":
      return v.includes(n);
    case "startsWith":
      return v.startsWith(n);
    case "endsWith":
      return v.endsWith(n);
    case "equals":
      return v === n;
    case "notEquals":
      return v !== n;
    default:
      return false;
  }
}
