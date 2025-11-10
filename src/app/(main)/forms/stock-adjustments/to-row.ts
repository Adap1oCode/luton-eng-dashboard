import type { StockAdjustmentRow } from "./stock-adjustments.config";

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
    item_number: d?.item_number != null ? Number(d.item_number) : null,
    qty: d?.qty ?? null,
    location: d?.location ?? null,
    note: d?.note ?? null,
    reason_code: d?.reason_code ?? null,
    multi_location: d?.multi_location ?? null,
    updated_at: d?.updated_at ?? null,
    updated_at_pretty: d?.updated_at_pretty ?? null,
    is_active: d?.qty !== null && d?.qty !== undefined && Number(d?.qty) > 0,
  };
}


