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
import inventoryItemCostByWarehouse from "./dashboards/inventory-item-cost-by-warehouse.ts";
import v_table_report_combined from "./dbdocs/v_table_report_combined.config.ts";

const resources = {
  // ✅ Database table names (primary keys)
  users,
  warehouses,
  roles,
  role_warehouse_rules,
  tcm_tally_cards,
  tcm_user_tally_card_entries,
  
  // ✅ Database view names (primary keys)
  "v_tcm_tally_cards_current": tcm_tally_cards_current,
  "v_tcm_user_tally_card_entries": v_tcm_user_tally_card_entries,
  "v_tcm_tally_card_entry_compare": v_tcm_tally_card_entry_compare,
  "v_table_report_combined": v_table_report_combined,
  "vw_dashboard_inventory_summary": inventorySummary,
  "vw_dashboard_inventory_by_warehouse": inventoryWarehouse,
  "vw_dashboard_inventory_items_by_uom": inventoryUom,
  "vw_dashboard_inventory_item_cost_by_warehouse": inventoryItemCostByWarehouse,

  // ✅ Friendly aliases for business-facing routes
  "stock-adjustments": tcm_user_tally_card_entries,
  "tally-cards": tcm_tally_cards,
  "inventory-summary": inventorySummary,
  "inventory-warehouse": inventoryWarehouse,
  "inventory-uom": inventoryUom,
  "inventory-item-cost-by-warehouse": inventoryItemCostByWarehouse,
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
  inventoryItemCostByWarehouse,
};
