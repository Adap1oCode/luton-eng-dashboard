// src/lib/data/resources/index.ts
// Import each config once, then export both named and default registry to avoid duplicate-import lint errors.
import role_warehouse_rules from "./role_warehouse_rules.config.ts";
import roles from "./roles.config.ts";
import tcm_tally_cards from "./tally_cards.config.ts";
import tcm_tally_cards_current from "./tally_cards_current.config.ts";
import tcm_user_tally_card_entries from "./user_tally_card_entries.config.ts";
import users from "./users.config.ts";
import v_tcm_tally_card_entry_compare from "./v_tcm_tally_card_entry_compare.config.ts";
import v_tcm_user_tally_card_entries from "./v_tcm_user_tally_card_entries.config.ts";
import warehouses from "./warehouses.config.ts";
import inventorySummary from "./dashboards/inventory-summary.ts";
import inventoryWarehouse from "./dashboards/inventory-warehouse.ts";
import inventoryUom from "./dashboards/inventory-uom.ts";
import inventoryDetails from "./dashboards/inventory-details.ts";
import inventoryItemCostByWarehouse from "./dashboards/inventory-item-cost-by-warehouse.ts";
import v_table_report_combined from "./dbdocs/v_table_report_combined.config.ts";

const resources = {
  users,
  warehouses,
  roles,
  role_warehouse_rules,
  tcm_tally_cards,
  tcm_tally_cards_current,
  tcm_user_tally_card_entries,
  v_tcm_user_tally_card_entries,
  v_tcm_tally_card_entry_compare,
  v_table_report_combined,
  inventorySummary,
  inventoryWarehouse,
  inventoryUom,
  inventoryDetails,
  inventoryItemCostByWarehouse,

  // ✅ Friendly aliases for business-facing routes
  "stock-adjustments": tcm_user_tally_card_entries,
  // ✅ Browser-friendly alias for tally cards screens
  "tally-cards": tcm_tally_cards,
  // ✅ Dashboard-friendly aliases for inventory resources
  "inventory-summary": inventorySummary,
  "inventory-warehouse": inventoryWarehouse,
  "inventory-uom": inventoryUom,
  "inventory-details": inventoryDetails,
  "inventory-item-cost-by-warehouse": inventoryItemCostByWarehouse,
  // ✅ DB documentation viewer (admin-only)
  "db-docs": v_table_report_combined,
};

export default resources;

// Also provide named exports for convenience
export {
  users,
  warehouses,
  roles,
  role_warehouse_rules,
  tcm_tally_cards,
  tcm_tally_cards_current,
  tcm_user_tally_card_entries,
  v_tcm_user_tally_card_entries,
  v_tcm_tally_card_entry_compare,
  v_table_report_combined,
  inventorySummary,
  inventoryWarehouse,
  inventoryUom,
  inventoryDetails,
  inventoryItemCostByWarehouse,
};
