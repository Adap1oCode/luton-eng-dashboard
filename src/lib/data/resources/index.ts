// src/lib/data/resources/index.ts
// Import each config once, then export both named and default registry to avoid duplicate-import lint errors.
import role_warehouse_rules from "./role_warehouse_rules.config.ts";
import roles from "./roles.config.ts";
import tcm_tally_cards from "./tally_cards.config.ts";
import tcm_tally_cards_current from "./v_tcm_tally_cards_current.config.ts";
import tcm_user_tally_card_entries from "./tcm_user_tally_card_entries.config.ts";
import users from "./users.config.ts";
import v_tcm_tally_card_entry_compare from "./v_tcm_tally_card_entry_compare.config.ts";
import v_tcm_user_tally_card_entries from "./v_tcm_user_tally_card_entries.config.ts";
import v_inventory_unique from "./v_inventory_unique.config.ts";
import v_inventory_current from "./v_inventory_current.config.ts";
import warehouses from "./warehouses.config.ts";
import inventory_summary from "./dashboards/inventory-summary.ts";
import inventoryWarehouse from "./dashboards/inventory-warehouse.ts";
import inventoryUom from "./dashboards/inventory-uom.ts";
import inventoryItemCostByWarehouse from "./dashboards/inventory-item-cost-by-warehouse.ts";
import v_table_report_combined from "./dbdocs/v_table_report_combined.config.ts";
import tcm_user_tally_card_entry_locations from "./tcm_user_tally_card_entry_locations.config.ts";
import warehouse_locations from "./warehouse_locations.config.ts";
import v_tcm_compare_stock from "./v_tcm_compare_stock.config.ts";
import permissions from "./permissions.config.ts";

const resources = {
  // ✅ Database table names (primary keys)
  users,
  warehouses,
  warehouse_locations,
  roles,
  role_warehouse_rules,
  tcm_tally_cards,
  tcm_user_tally_card_entries,
  tcm_user_tally_card_entry_locations,
  v_tcm_user_tally_card_entries,
  v_tcm_tally_card_entry_compare,
  v_tcm_tally_cards_current: tcm_tally_cards_current,
  v_inventory_unique,
  v_inventory_current,
  v_table_report_combined,
  inventory_summary,
  inventoryWarehouse,
  inventoryUom,
  inventoryItemCostByWarehouse,
  v_tcm_compare_stock,

  // ✅ Friendly aliases for business-facing routes
  "stock-adjustments": tcm_user_tally_card_entries,
  "stock-adjustment-locations": tcm_user_tally_card_entry_locations,
  "tally-cards": tcm_tally_cards,
  "warehouse-locations": warehouse_locations,
  "inventory-unique": v_inventory_unique,
  "inventory-current": v_inventory_current,
  "compare-stock": v_tcm_compare_stock,
  // ✅ Permissions
  "permissions": permissions,
  // ✅ Dashboard-friendly aliases for inventory resources
  "inventory-summary": inventory_summary,
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
  warehouse_locations,
  roles,
  role_warehouse_rules,
  permissions,
  tcm_tally_cards,
  tcm_tally_cards_current,
  tcm_user_tally_card_entries,
  tcm_user_tally_card_entry_locations,
  v_tcm_user_tally_card_entries,
  v_tcm_tally_card_entry_compare,
  v_inventory_unique,
  v_inventory_current,
  v_table_report_combined,
  inventory_summary,
  inventoryWarehouse,
  inventoryUom,
  inventoryItemCostByWarehouse,
  v_tcm_compare_stock,
};
