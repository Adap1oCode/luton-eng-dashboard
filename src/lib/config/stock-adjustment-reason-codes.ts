// -----------------------------------------------------------------------------
// FILE: src/lib/config/stock-adjustment-reason-codes.ts
// PURPOSE: Config-driven reason code options for Stock Adjustments
// -----------------------------------------------------------------------------

/**
 * Allowed reason codes for stock adjustments.
 * Default is 'UNSPECIFIED' if not provided.
 */
export const STOCK_ADJUSTMENT_REASON_CODES = [
  { value: "UNSPECIFIED", label: "Unspecified" },
  { value: "DAMAGE", label: "Damage" },
  { value: "LOST", label: "Lost" },
  { value: "FOUND", label: "Found" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "COUNT_CORRECTION", label: "Count Correction" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "OTHER", label: "Other" },
] as const;

/**
 * Default reason code value
 */
export const DEFAULT_REASON_CODE = "UNSPECIFIED";

/**
 * Get reason code label by value
 */
export function getReasonCodeLabel(value: string | null | undefined): string {
  const code = STOCK_ADJUSTMENT_REASON_CODES.find((c) => c.value === value);
  return code?.label ?? "Unspecified";
}

/**
 * Check if a reason code allows zero quantity
 */
export function allowsZeroQuantity(reasonCode: string | null | undefined): boolean {
  return reasonCode === "COUNT_CORRECTION";
}







