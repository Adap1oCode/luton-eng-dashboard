-- Create the missing inventory dashboard views
-- These views will provide the aggregated data that the API endpoints need

-- 1. Inventory Summary View (single row with totals)
CREATE OR REPLACE VIEW vw_dashboard_inventory_summary AS
SELECT 
  COUNT(*) as total_inventory_records,
  COUNT(DISTINCT item_number) as unique_item_count,
  COALESCE(SUM(total_available), 0) as total_available_stock,
  COALESCE(SUM(on_order), 0) as total_on_order_quantity,
  COALESCE(SUM(committed), 0) as total_committed_quantity,
  COUNT(*) FILTER (WHERE COALESCE(total_available, 0) = 0) as out_of_stock_count,
  COALESCE(SUM((on_order * COALESCE(item_cost::numeric, 0))), 0) as total_on_order_value,
  COALESCE(SUM((total_available * COALESCE(item_cost::numeric, 0))), 0) as total_inventory_value,
  COALESCE(SUM((committed * COALESCE(item_cost::numeric, 0))), 0) as total_committed_value
FROM inventory
WHERE is_deleted = false;

-- 2. Inventory Details by UOM View (for the inventory-details resource)
CREATE OR REPLACE VIEW vw_dashboard_inventory_details_by_uom AS
SELECT 
  item_number,
  type,
  description,
  total_available,
  total_checked_out,
  total_in_house,
  on_order,
  committed,
  tax_code,
  item_cost,
  cost_method,
  item_list_price,
  item_sale_price,
  lot,
  date_code,
  manufacturer,
  category,
  unit_of_measure,
  alt_item_number,
  serial_number,
  checkout_length,
  attachment,
  location,
  warehouse,
  height,
  width,
  depth,
  weight,
  max_volume,
  event_type,
  is_deleted
FROM inventory
WHERE is_deleted = false;

-- 3. Inventory by UOM View (for the inventory-uom resource)
CREATE OR REPLACE VIEW vw_dashboard_inventory_by_uom AS
SELECT 
  unit_of_measure as uom,
  COUNT(*) as count,
  COALESCE(SUM(total_available), 0) as total_available,
  COALESCE(SUM((total_available * COALESCE(item_cost::numeric, 0))), 0) as total_value
FROM inventory
WHERE is_deleted = false
  AND unit_of_measure IS NOT NULL
GROUP BY unit_of_measure
ORDER BY count DESC;

-- The vw_dashboard_inventory_by_warehouse view already exists based on the schema
-- Let's verify it has the right structure and add any missing fields

-- 4. Create a simple inventory table view for the main inventory endpoint
CREATE OR REPLACE VIEW vw_inventory AS
SELECT 
  item_number,
  type,
  description,
  total_available,
  total_checked_out,
  total_in_house,
  on_order,
  committed,
  tax_code,
  item_cost,
  cost_method,
  item_list_price,
  item_sale_price,
  lot,
  date_code,
  manufacturer,
  category,
  unit_of_measure,
  alt_item_number,
  serial_number,
  checkout_length,
  attachment,
  location,
  warehouse,
  height,
  width,
  depth,
  weight,
  max_volume,
  event_type,
  is_deleted,
  created_at,
  updated_at
FROM inventory
WHERE is_deleted = false;


