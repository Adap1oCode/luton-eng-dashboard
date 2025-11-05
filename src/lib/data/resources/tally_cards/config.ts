import type { ResourceConfig } from "@/lib/data/types";

import type { TallyCard, TallyCardInput } from "./types";

/**
 * Matches public.tcm_tally_cards exactly (using your provided schema).
 * No DB triggers/functions assumed; updated_at should be set by app code on writes.
 * History is attached via oneToMany relation.
 */
export const tcmTallyCardsConfig = {
  table: "tcm_tally_cards",
  pk: "id",
  select:
    "id, tally_card_number, warehouse_id, warehouse, item_number, note, is_active, created_at, updated_at, status, owner, quantity",

  // Useful global search fields
  search: ["tally_card_number", "warehouse", "note"] as const,

  activeFlag: "is_active",
  defaultSort: { column: "tally_card_number", desc: false } as const,

  // DB → domain
  toDomain: (r: any): TallyCard => ({
    id: r.id,
    card_uid: r.card_uid,
    warehouse_id: r.warehouse_id,
    tally_card_number: r.tally_card_number,
    warehouse: r.warehouse,
    item_number: Number(r.item_number),
    note: r.note ?? null,
    is_active: !!r.is_active,
    snapshot_at: r.snapshot_at ?? null,
    hashdiff: r.hashdiff ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
    status: r.status ?? null,
    owner: r.owner ?? null,
    quantity: r.quantity ? Number(r.quantity) : null,
  }),

  // domain input → DB payload (app should set updated_at explicitly on writes)
  fromInput: (i: TallyCardInput) => ({
    tally_card_number: i.tally_card_number,
    warehouse_id: i.warehouse_id,
    warehouse: i.warehouse ?? null,
    // Convert item_number from string (dropdown) or number to number for DB
    item_number: typeof i.item_number === "string" ? Number(i.item_number) : i.item_number,
    note: i.note ?? null,
    is_active: i.is_active ?? true,
    status: i.status ?? null,
    owner: i.owner ?? null,
    quantity: i.quantity ?? null,
    updated_at: new Date().toISOString(),
  }),

  // ✅ Attach history as a child relation of this resource
  relations: [
    {
      kind: "oneToMany",
      name: "history",
      targetTable: "tcm_tally_card_history",
      foreignKey: "tally_card_id", // child points to this card's id
      targetSelect:
        "id, tally_card_id, action, from_item_number, to_item_number, from_warehouse, to_warehouse, note, changed_at",
      orderBy: { column: "changed_at", desc: true } as const,
      includeByDefault: false, // keep list payloads light; load on-demand
      // limit: 100, // optionally cap if histories can get large
    },
  ] as const,

  // Schema definition for field validation
  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      tally_card_number: { type: "text", write: true },
      warehouse_id: { type: "uuid", write: true },
      warehouse: { type: "text", write: true },
      item_number: { type: "bigint", write: true },
      note: { type: "text", nullable: true, write: true },
      is_active: { type: "bool", write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
      status: { type: "text", nullable: true, write: true },
      owner: { type: "text", nullable: true, write: true },
      quantity: { type: "bigint", nullable: true, write: true },
    },
  },

  // No derived fields at this stage
  postProcess: (rows: TallyCard[]) => rows,
} satisfies ResourceConfig<TallyCard, TallyCardInput>;

export default tcmTallyCardsConfig;
