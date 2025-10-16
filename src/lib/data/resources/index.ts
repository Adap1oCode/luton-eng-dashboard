// src/lib/data/resources/index.ts

// Re-exports (named)
export { default as warehouses } from "./warehouses.config.ts";
export { default as roles } from "./roles.config.ts";
export { default as role_warehouse_rules } from "./role_warehouse_rules.config.ts";
export { default as tcm_tally_cards } from "./tally_cards.config.ts";
export { default as tcm_tally_cards_current } from "./tally_cards_current.config.ts";
export { default as tcm_user_tally_card_entries } from "./user_tally_card_entries.config.ts";
export { default as users } from "./users.config.ts";
export { default as v_tcm_user_tally_card_entries } from "./v_tcm_user_tally_card_entries.config.ts";


// Default export (registry object)
import warehouses from "./warehouses.config.ts";
import roles from "./roles.config.ts";
import role_warehouse_rules from "./role_warehouse_rules.config.ts";
import tcm_tally_cards from "./tally_cards.config.ts";
import tcm_tally_cards_current from "./tally_cards_current.config.ts";
import tcm_user_tally_card_entries from "./user_tally_card_entries.config.ts";
import v_tcm_user_tally_card_entries from "./v_tcm_user_tally_card_entries.config.ts";
import users from "./users.config.ts";

const resources = {
  warehouses,
  roles,
  role_warehouse_rules,
  tcm_tally_cards,
  tcm_tally_cards_current,
  tcm_user_tally_card_entries,
  v_tcm_user_tally_card_entries,
  users,
};

export default resources;
