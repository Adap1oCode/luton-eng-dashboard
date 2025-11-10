import type { CompareStockRow } from "./compare-stock.config";

function normalizeString(value: any): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length ? str : null;
}

function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "t" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "f" || normalized === "0" || normalized === "no") return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return false;
}

export function toRow(d: any): CompareStockRow {
  const tallyCard = d?.tally_card ?? null;
  const warehouse = d?.warehouse ?? null;
  const location = d?.location ?? null;

  const rowKey = d?.row_key ?? [tallyCard ?? "", warehouse ?? "", location ?? ""].join("|");

  return {
    id: rowKey,
    row_key: rowKey,
    tally_card: tallyCard,
    item_number: normalizeString(d?.item_number),
    warehouse,
    location,
    ims_location: d?.ims_location ?? null,
    so_qty: normalizeString(d?.so_qty),
    ims_qty: normalizeString(d?.ims_qty),
    qty_diff: normalizeString(d?.qty_diff),
    multi_location: parseBoolean(d?.multi_location),
    status: d?.status ?? null,
  };
}
