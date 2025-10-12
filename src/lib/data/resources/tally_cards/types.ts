// Canonical types for the Tally Cards resource (domain + view)

// src/lib/data/resources/tally_cards/types.ts

export interface TallyCard {
  id: string;
  card_uid: string;
  warehouse_id: string;
  tally_card_number: string;
  item_number: number;
  note: string | null;
  is_active: boolean;
  snapshot_at: string | null;
  hashdiff: string | null;
  created_at: string | null;
}

export interface TallyCardInput {
  card_uid?: string | null;
  warehouse_id: string;
  tally_card_number: string;
  item_number: number;
  note?: string | null;
  is_active?: boolean;
  snapshot_at?: string | null;
}

// Transport shape for “View All Tally Cards”
export type TallyCardRow = {
  id: string;
  tally_card_number: string;
  warehouse: string;
  item_number: string; // normalised string for UI
  note: string | null;
  is_active: boolean;
  created_at: string | null;
};
