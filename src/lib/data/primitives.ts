// src/lib/data/primitives.ts
// Purpose: single source of truth for common Zod field types (UUID, DateTime, Numeric, etc.)
// Use: import { UUID, DateTime, Numeric, Int, Nullable } from "@/lib/data/primitives";

import { z } from "zod";

/**
 * UUID
 * Standard Postgres UUID as a string.
 */
export const UUID = z.string().uuid();

/**
 * DateTime
 * ISO 8601 string with timezone offset allowed (Supabase/PostgREST friendly).
 * Example: "2025-10-13T12:34:56.789Z" or "2025-10-13T12:34:56+00:00"
 */
export const DateTime = z.string().datetime({ offset: true });

/**
 * Nullable
 * Convenience wrapper to keep schemas tidy.
 *   created_at: Nullable(DateTime)
 */
export const Nullable = <T extends z.ZodTypeAny>(t: T) => t.nullable();

/**
 * Numeric
 * Accepts numbers or numeric strings and coerces to JS number.
 * Useful for PostgREST/views that may return "123" instead of 123.
 * Fails validation if the coerced value is NaN or not a finite number (handled by z.number()).
 */
export const Numeric = z.preprocess((v) => {
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return v; // let z.number() fail
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : v; // invalid strings pass through to fail at z.number()
  }
  return v;
}, z.number());

/**
 * Int
 * Same as Numeric but enforces integer.
 */
export const Int = z.preprocess((v) => {
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return v;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().int());
