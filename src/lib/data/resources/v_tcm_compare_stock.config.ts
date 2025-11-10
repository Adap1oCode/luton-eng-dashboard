import type { ResourceConfig } from "../types";

export interface CompareStockRow {
  row_key: string;
  tally_card: string | null;
  item_number: string | null;
  warehouse: string | null;
  location: string | null;
  ims_location: string | null;
  so_qty: string | null;
  ims_qty: string | null;
  qty_diff: string | null;
  multi_location: boolean | null;
  status: string | null;
}

export type CompareStockInput = never;

const v_tcm_compare_stock: ResourceConfig<CompareStockRow, CompareStockInput> = {
  table: "mv_tcm_compare_stock",
  pk: "row_key",
  select: "row_key, tally_card, item_number, warehouse, location, ims_location, so_qty, ims_qty, qty_diff, multi_location, status",
  search: ["tally_card", "warehouse", "location", "status"],
  defaultSort: { column: "tally_card", desc: false },
  warehouseScope: {
    mode: "column",
    column: "warehouse",
  },
  fromInput: (_input: CompareStockInput) => {
    throw new Error("v_tcm_compare_stock is read-only");
  },
  toDomain: (row: any): CompareStockRow => ({
    row_key: row?.row_key ?? "",
    tally_card: row?.tally_card ?? null,
    item_number: row?.item_number != null ? String(row.item_number) : null,
    warehouse: row?.warehouse ?? null,
    location: row?.location ?? null,
    ims_location: row?.ims_location ?? null,
    so_qty: row?.so_qty != null ? String(row.so_qty) : null,
    ims_qty: row?.ims_qty != null ? String(row.ims_qty) : null,
    qty_diff: row?.qty_diff != null ? String(row.qty_diff) : null,
    multi_location: typeof row?.multi_location === "boolean" ? row.multi_location : row?.multi_location ?? null,
    status: row?.status ?? null,
  }),
  schema: {
    fields: {
      row_key: { type: "text", readonly: true },
      tally_card: { type: "text", nullable: true, readonly: true },
      item_number: { type: "bigint", nullable: true, readonly: true },
      warehouse: { type: "text", nullable: true, readonly: true },
      location: { type: "text", nullable: true, readonly: true },
      ims_location: { type: "text", nullable: true, readonly: true },
      so_qty: { type: "text", nullable: true, readonly: true },
      ims_qty: { type: "text", nullable: true, readonly: true },
      qty_diff: { type: "text", nullable: true, readonly: true },
      multi_location: { type: "bool", nullable: true, readonly: true },
      status: { type: "text", nullable: true, readonly: true },
    },
  },
};

export default v_tcm_compare_stock;
