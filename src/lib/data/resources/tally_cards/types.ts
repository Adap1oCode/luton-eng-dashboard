// Canonical types for the Tally Cards resource (domain + view)

export type TallyCard = {
  id: string;                 // uuid (PK)
  tally_card_number: string;  // text, NOT NULL
  warehouse: string;          // text, NOT NULL (code)
  item_number: number;        // bigint in DB → number here
  note: string | null;        // text, nullable
  is_active: boolean;         // boolean, NOT NULL
  created_at: string | null;  // ISO timestamp (nullable from DB)
  updated_at: string | null;  // ISO timestamp (nullable from DB)
  history?: TallyCardHistory[]; // optional child relation
};

export type TallyCardInput = {
  tally_card_number: string;
  warehouse: string;          // code (can switch to warehouse_id later)
  item_number: number;
  note?: string | null;
  is_active?: boolean;
};

export type TallyCardHistory = {
  id: number;                 // bigint PK (sequence)
  tally_card_id: string;      // uuid (FK → tcm_tally_cards.id)
  action: string;             // e.g. CREATE, MOVE_WAREHOUSE, UPDATE_ITEM_NUMBER
  from_item_number: number | null;
  to_item_number: number | null;
  from_warehouse: string | null;
  to_warehouse: string | null;
  note: string | null;
  changed_at: string;         // ISO timestamp
};

// Transport shape for “View All Tally Cards”
export type TallyCardRow = {
  id: string;
  tally_card_number: string;
  warehouse: string;
  item_number: string;        // normalised string for UI
  note: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};
