import roleWarehouseRules from "./role_warehouse_rules.config";
import roles from "./roles.config";
import tcmTallyCards from "./tally_cards.config";
import tcmTallyCardsCurrent from "./tally_cards_current.config";
import tcmUserTallyCardEntries from "./user_tally_card_entries.config";
import users from "./users.config";
import warehouses from "./warehouses.config";

export const resources = {
  warehouses,
  roles,
  role_warehouse_rules: roleWarehouseRules,
  tcm_tally_cards: tcmTallyCards, // full write table
  tcm_tally_cards_current: tcmTallyCardsCurrent, // read-only view
  tcm_user_tally_card_entries: tcmUserTallyCardEntries,
  users,
} as const;

export type ResourceKey = keyof typeof resources;
export default resources; // ✅ add this line
