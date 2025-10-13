// src/lib/data/resources/index.ts
export { default as warehouses } from "./warehouses.config";
export { default as roles } from "./roles.config";
export { default as role_warehouse_rules } from "./role_warehouse_rules.config";
export { default as tcm_tally_cards } from "./tally_cards.config";
export { default as tcm_tally_cards_current } from "./tally_cards_current.config";
export { default as tcm_user_tally_card_entries } from "./user_tally_card_entries.config";
export { default as users } from "./users.config";

// Default export (registry object)
import warehouses from "./warehouses.config";
import roles from "./roles.config";
import role_warehouse_rules from "./role_warehouse_rules.config";
import tcm_tally_cards from "./tally_cards.config";
import tcm_tally_cards_current from "./tally_cards_current.config";
import tcm_user_tally_card_entries from "./user_tally_card_entries.config";
import users from "./users.config";

const resources = {
  warehouses,
  roles,
  role_warehouse_rules,
  tcm_tally_cards,
  tcm_tally_cards_current,
  tcm_user_tally_card_entries,
  users,
};

export default resources;
