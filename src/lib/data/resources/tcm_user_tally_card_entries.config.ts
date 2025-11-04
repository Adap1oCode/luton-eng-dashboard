import type { ResourceConfig, TcmUserEntry, UUID } from "../types";

/**
 * Physical composite key (user_id, tally_card_number), but this layer
 * supports single-column pk only. We use 'user_id' as pk for typing;
 * handlers can include 'tally_card_number' in filters/body as needed.
 */

export type TallyCardEntryInput = {
  id: UUID;
  user_id: UUID;
  tally_card_number?: string;
  card_uid?: UUID | null;
  qty?: number | null;
  location?: string | null;
  note?: string | null;
};

const tcm_user_tally_card_entries: ResourceConfig<TcmUserEntry, TallyCardEntryInput> = {
  table: "tcm_user_tally_card_entries",
  pk: "id", // single-column pk per current layer constraints
  select: "id, updated_by_user_id, role_family, tally_card_number, card_uid, qty, location, note, updated_at",
  search: ["tally_card_number", "location", "note"],
  defaultSort: { column: "updated_at", desc: true },

  // 🔒 SCOPING (now by role family instead of user)
  // Ownership: user sees entries from their role family unless they have a bypass permission
  ownershipScope: {
    mode: "role_family",
    column: "role_family",
    bypassPermissions: ["entries:read:any", "admin:read:any"],
  },
  // Note: warehouse scoping is handled via view config (warehouse_id comes from tally_cards via card_uid)

  fromInput: (input: TallyCardEntryInput) => ({
    updated_by_user_id: input.user_id, // map user_id to updated_by_user_id (updater)
    tally_card_number: input.tally_card_number ?? undefined,
    card_uid: input.card_uid ?? null,
    qty: input.qty === undefined || input.qty === null ? null : Number(input.qty),
    location: input.location ?? null,
    note: input.note ?? null,
    // role_family is derived/set elsewhere (e.g., via database trigger or server-side logic)
  }),

  toDomain: (row: unknown) => row as TcmUserEntry,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      user_id: { type: "uuid", write: false },
      tally_card_number: { type: "text", write: true },
      card_uid: { type: "uuid", nullable: true, write: true },
      qty: { type: "int", nullable: true, write: true },
      location: { type: "text", nullable: true, write: true },
      note: { type: "text", nullable: true, write: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
    },
  },

  // 📜 HISTORY (SCD2) - Configurable history tracking
  // History queries the base SCD2 table (same as Edit screen), then enriches server-side
  history: {
    enabled: true,
    source: {
      // Query base SCD2 table (same as Edit screen) - not the view which only shows top 1 per anchor
      // historyResource omitted → defaults to current resource (base table)
      anchorColumn: "tally_card_number",
      // warehouseColumn will be resolved from card_uid → tally_cards → warehouse_id during enrichment
    },
    // scope omitted → mirror list ownership & warehouse behavior
    // Ownership scoping: uses base table's ownershipScope (role_family with bypass)
    // Warehouse scoping: applied post-enrichment (base table doesn't have warehouse_id directly)
    projection: {
      columns: [
        "updated_at",
        "updated_at_pretty", // formatted server-side if not present
        "role_family", // owner dimension (replaces user_id)
        "updated_by_user_id", // included for elevated users to inspect updater
        "full_name", // enriched from users table via updated_by_user_id
        "qty",
        "location",
        "note",
        "warehouse", // enriched from tally_cards → warehouses
      ],
      orderBy: { column: "updated_at", direction: "desc" },
    },
    ui: {
      columns: [
        { key: "updated_at_pretty", label: "Updated", format: "date", width: 200 }, // Full timestamp (date + time)
        { key: "full_name", label: "User", width: 200 },
        { key: "warehouse", label: "Warehouse", width: 150 },
        { key: "role_family", label: "Role Family", width: 150 },
        { key: "qty", label: "Qty", format: "number", width: 100 },
        { key: "location", label: "Location", width: 150 },
        { key: "note", label: "Note" },
      ],
      tabBadgeCount: true,
    },
  },
};

export default tcm_user_tally_card_entries;
