// src/lib/data/resources/v_tcm_tally_card_entry_compare.config.ts
import type { ResourceConfig, UUID } from "../types";

/** Domain row exposed by v_tcm_tally_card_entry_compare (read-only) */
export type TallyCardEntryCompareRow = {
  // scoping context
  warehouse_id: UUID;
  warehouse: string;

  // identity (unique within a warehouse)
  tally_card_number: string;

  // store officer side
  store_officer_user_id: UUID | null;
  store_officer_name: string | null;
  store_officer_role_code: string | null;
  store_officer_qty: number | null;
  store_officer_location: string | null;
  store_officer_updated_at: string | null; // ISO

  // auditor side
  auditor_user_id: UUID | null;
  auditor_name: string | null;
  auditor_role_code: string | null;
  auditor_qty: number | null;
  auditor_location: string | null;
  auditor_updated_at: string | null; // ISO

  // comparison flags
  qty_diff: boolean;
  location_diff: boolean;
  qty_diff_yn: "YES" | "NO";
  location_diff_yn: "YES" | "NO";
};

/** Read-only input (no writes allowed against this view) */
export type TallyCardEntryCompareInput = never;

const v_tcm_tally_card_entry_compare: ResourceConfig<TallyCardEntryCompareRow, TallyCardEntryCompareInput> = {
  // 🔍 points to the compare view we created
  table: "v_tcm_tally_card_entry_compare",

  // ⚠️ Our provider currently supports single-column PKs.
  // Uniqueness is (warehouse_id, tally_card_number); we rely on warehouseScope to keep it unique.
  pk: "tally_card_number",

  // Projection
  select: [
    "warehouse_id",
    "warehouse",
    "tally_card_number",

    "store_officer_name",
    "store_officer_role_code",
    "store_officer_qty",
    "store_officer_location",
    "store_officer_updated_at",

    "auditor_name",
    "auditor_role_code",
    "auditor_qty",
    "auditor_location",
    "auditor_updated_at",

    "qty_diff",
    "location_diff",
    "qty_diff_yn",
    "location_diff_yn",
  ].join(", "),

  // UI search
  search: ["tally_card_number", "store_officer_name", "store_officer_location", "auditor_name", "auditor_location"],

  // Sort (use a stable default; “latest” would need a column — we can add one later)
  defaultSort: { column: "tally_card_number", desc: false },

  // 🔒 Warehouse scoping (matches role_warehouse_rules.warehouse_id)
  warehouseScope: { mode: "column", column: "warehouse_id" },

  // Ownership: comparing two users’ entries isn’t “owned” by a single user; show per-warehouse
  // ownershipScope: { mode: "none" },

  // This view is read-only — the provider should never try to write here.
  // (We keep these functions only to satisfy the generic type.)
  fromInput: (_: never) => {
    throw new Error("v_tcm_tally_card_entry_compare is read-only");
  },
  toDomain: (row: unknown) => row as TallyCardEntryCompareRow,

  schema: {
    fields: {
      warehouse_id: { type: "uuid", readonly: true },
      warehouse: { type: "text", readonly: true },

      tally_card_number: { type: "text", readonly: true },

      store_officer_name: { type: "text", nullable: true, readonly: true },
      store_officer_role_code: { type: "text", nullable: true, readonly: true },
      store_officer_qty: { type: "int", nullable: true, readonly: true },
      store_officer_location: { type: "text", nullable: true, readonly: true },
      store_officer_updated_at: { type: "timestamp", nullable: true, readonly: true },

      auditor_name: { type: "text", nullable: true, readonly: true },
      auditor_role_code: { type: "text", nullable: true, readonly: true },
      auditor_qty: { type: "int", nullable: true, readonly: true },
      auditor_location: { type: "text", nullable: true, readonly: true },
      auditor_updated_at: { type: "timestamp", nullable: true, readonly: true },

      qty_diff: { type: "bool", readonly: true },
      location_diff: { type: "bool", readonly: true },
      qty_diff_yn: { type: "text", readonly: true },
      location_diff_yn: { type: "text", readonly: true },
    },
  },
};

export default v_tcm_tally_card_entry_compare;
