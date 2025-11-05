/**
 * Pure utility functions for dynamic form layout.
 * These functions are extracted for testability and reusability.
 */

import type { FieldDef } from "./dynamic-field";

/**
 * Clamps a number between min and max (inclusive).
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Auto-place fields when no explicit column given.
 * Supports row-first fill with true horizontal span across a single grid.
 * 
 * @param fields - Array of field definitions
 * @param columns - Number of columns in the grid (1-4)
 * @returns Fields with column and span properties assigned
 */
export function autoPlaceRowFirst(fields: FieldDef[], columns: number): FieldDef[] {
  let col = 1; // current column start for next field (1..columns)
  return fields.map((raw) => {
    const span = clamp(raw.span ?? 1, 1, columns);
    // If span doesn't fit current row, wrap to next row
    if (col + span - 1 > columns) col = 1;
    const placed: FieldDef = { ...raw, column: raw.column ?? col, span };
    col += span;
    if (col > columns) col = 1;
    return placed;
  });
}

/**
 * Column-first placement (fills column 1 top→down, then column 2, etc.).
 * For spans, we still assign a start col; visually span helps only when the
 * field is wide and near the end of a row. 'row' mode is recommended.
 * 
 * @param fields - Array of field definitions
 * @param columns - Number of columns in the grid (1-4)
 * @returns Fields with column and span properties assigned
 */
export function autoPlaceColumnFirst(fields: FieldDef[], columns: number): FieldDef[] {
  const perCol = Math.ceil(fields.length / columns);
  return fields.map((raw, i) => {
    const span = clamp(raw.span ?? 1, 1, columns);
    const col = raw.column ?? clamp(Math.floor(i / perCol) + 1, 1, columns);
    return { ...raw, column: col, span };
  });
}

/**
 * Tailwind-safe class map for lg:col-start (1-4).
 * 
 * @param n - Column start position (1-4)
 * @returns Tailwind class string
 */
export function colStartClass(n: number): string {
  switch (n) {
    case 1:
      return "lg:col-start-1";
    case 2:
      return "lg:col-start-2";
    case 3:
      return "lg:col-start-3";
    case 4:
      return "lg:col-start-4";
    default:
      return "lg:col-start-1";
  }
}

/**
 * Tailwind-safe class map for lg:col-span (1-4).
 * 
 * @param n - Column span (1-4)
 * @returns Tailwind class string
 */
export function colSpanClass(n: number): string {
  switch (n) {
    case 1:
      return "lg:col-span-1";
    case 2:
      return "lg:col-span-2";
    case 3:
      return "lg:col-span-3";
    case 4:
      return "lg:col-span-4";
    default:
      return "lg:col-span-1";
  }
}

/**
 * Build responsive grid class for up to 4 columns.
 * 
 * @param columns - Number of columns (1-4)
 * @returns Tailwind grid class string
 */
export function gridColsClass(columns: number): string {
  if (columns <= 1) return "grid grid-cols-1 gap-8";
  if (columns === 2) return "grid grid-cols-1 gap-8 lg:grid-cols-2";
  if (columns === 3) return "grid grid-cols-1 gap-8 lg:grid-cols-3";
  return "grid grid-cols-1 gap-8 lg:grid-cols-3 xl:grid-cols-4";
}

