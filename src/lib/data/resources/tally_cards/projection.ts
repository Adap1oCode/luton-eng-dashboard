import type { TallyCard, TallyCardRow } from "./types";

export function toRow(d: TallyCard): TallyCardRow {
  return {
    id: d.id,
    tally_card_number: d.tally_card_number,
    warehouse: d.warehouse,
    item_number: String(d.item_number ?? ""),
    note: d.note ?? null,
    is_active: !!d.is_active,
    created_at: d.created_at ?? null,
    updated_at: d.updated_at ?? null,
  };
}

export function mapRows(rows: TallyCard[]): TallyCardRow[] {
  return rows.map(toRow);
}
