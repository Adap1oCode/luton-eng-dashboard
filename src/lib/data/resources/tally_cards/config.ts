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

  // Supabase select string (kept as a single string for PostgREST/SDK parity)
  select: "id, tally_card_number, warehouse, item_number, note, is_active, created_at",

  // Useful global search fields
  search: ["tally_card_number", "warehouse", "note"] as const,

  activeFlag: "is_active",
  defaultSort: { column: "tally_card_number", desc: false } as const,

  // DB → domain
  toDomain: (r: any): TallyCard => ({
    id: r.id,
    tally_card_number: r.tally_card_number,
    warehouse: r.warehouse,
    item_number: Number(r.item_number),
    note: r.note ?? null,
    is_active: !!r.is_active,
    created_at: r.created_at ?? null,
  }),

  // domain input → DB payload (app should set updated_at explicitly on writes)
  fromInput: (i: TallyCardInput) => ({
    tally_card_number: i.tally_card_number,
    warehouse: i.warehouse,
    item_number: i.item_number,
    note: i.note ?? null,
    is_active: i.is_active ?? true,
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

  // No derived fields at this stage
  postProcess: (rows: TallyCard[]) => rows,
} satisfies ResourceConfig<TallyCard, TallyCardInput>;

export default tcmTallyCardsConfig;
