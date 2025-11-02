import type { StockAdjustmentRow } from "./view.config";

/**
 * Transforms raw API response to StockAdjustmentRow.
 * Shared between server and client to ensure type consistency.
 */
export function toRow(d: any): StockAdjustmentRow {
  return {
    id: String(d?.id ?? ""),
    full_name: String(d?.full_name ?? ""),
    warehouse: String(d?.warehouse ?? ""),
    tally_card_number: d?.tally_card_number ?? null,
    qty: d?.qty ?? null,
    location: d?.location ?? null,
    note: d?.note ?? null,
    updated_at: d?.updated_at ?? null,
    updated_at_pretty: d?.updated_at_pretty ?? null,
    is_active: d?.qty !== null && d?.qty !== undefined && Number(d?.qty) > 0,
  };
}


