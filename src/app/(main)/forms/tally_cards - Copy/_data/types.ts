// Canonical types for the Tally Cards screen

export type TallyCard = {
  id: string;                 // uuid (PK)
  tally_card_number: string;  // text, NOT NULL
  warehouse: string;          // text, NOT NULL (code)
  item_number: number;        // bigint in DB → number here
  note: string | null;        // text, nullable
  is_active: boolean;         // boolean, NOT NULL
  created_at: string;         // ISO timestamp
  updated_at: string;         // ISO timestamp

  // Child relation (optional, loaded via config relation)
  history?: TallyCardHistory[];
};

export type TallyCardInput = {
  tally_card_number: string;
  warehouse: string;          // code (we can switch to warehouse_id later if you add it)
  item_number: number;
  note?: string | null;
  is_active?: boolean;
};

// Append-only audit log for card changes
export type TallyCardHistory = {
  id: number;                 // bigint PK (sequence)
  tally_card_id: string;      // uuid (FK -> tcm_tally_cards.id)
  action: string;             // e.g. CREATE, MOVE_WAREHOUSE, UPDATE_ITEM_NUMBER
  from_item_number: number | null; // bigint nullable
  to_item_number: number | null;   // bigint nullable
  from_warehouse: string | null;   // text code
  to_warehouse: string | null;     // text code
  note: string | null;             // optional comment/reason
  changed_at: string;              // ISO timestamp
};

export type TallyCardHistoryInput = {
  tally_card_id: string;
  action: string;
  from_item_number?: number | null;
  to_item_number?: number | null;
  from_warehouse?: string | null;
  to_warehouse?: string | null;
  note?: string | null;
};
