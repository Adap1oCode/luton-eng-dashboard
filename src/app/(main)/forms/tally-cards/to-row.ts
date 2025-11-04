import type { TallyCardRow } from "./tally-cards.config";

/**
 * Transforms raw API response to TallyCardRow.
 * Shared between server and client to ensure type consistency.
 */
export function toRow(d: any): TallyCardRow {
  return {
    id: String(d?.id ?? ""),
    card_uid: d?.card_uid ?? null,
    warehouse_id: d?.warehouse_id ?? null,
    warehouse_name: d?.warehouse_name ?? null,
    tally_card_number: d?.tally_card_number ?? null,
    item_number: d?.item_number !== null && d?.item_number !== undefined ? Number(d.item_number) : null,
    note: d?.note ?? null,
    is_active: d?.is_active ?? null,
    created_at: d?.created_at ?? null,
    snapshot_at: d?.snapshot_at ?? null,
    updated_at: d?.updated_at ?? null,
    updated_at_pretty: d?.updated_at_pretty ?? null,
  };
}


