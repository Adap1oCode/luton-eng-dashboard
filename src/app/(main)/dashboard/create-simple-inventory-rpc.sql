-- Simplified get_inventory_rows RPC function
-- This handles the specific filters we need for the dashboard

CREATE OR REPLACE FUNCTION get_inventory_rows(
  _filter jsonb DEFAULT NULL,
  _distinct boolean DEFAULT false,
  _range_from integer DEFAULT 0,
  _range_to integer DEFAULT 100
)
RETURNS TABLE (
  item_number integer,
  type text,
  description text,
  total_available numeric,
  total_checked_out numeric,
  total_in_house numeric,
  on_order numeric,
  committed numeric,
  tax_code text,
  item_cost text,
  cost_method text,
  item_list_price numeric,
  item_sale_price numeric,
  lot text,
  date_code text,
  manufacturer text,
  category text,
  unit_of_measure text,
  alt_item_number text,
  serial_number text,
  checkout_length numeric,
  attachment text,
  location text,
  warehouse text,
  height numeric,
  width numeric,
  depth numeric,
  weight numeric,
  max_volume numeric,
  event_type text,
  is_deleted boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
DECLARE
  base_query text;
  filter_condition text := '';
  final_query text;
BEGIN
  -- Base query
  base_query := 'SELECT * FROM inventory WHERE is_deleted = false';
  
  -- Add filter conditions
  IF _filter IS NOT NULL THEN
    -- Handle total_available = 0 (out of stock)
    IF (_filter->>'column') = 'total_available' AND (_filter->>'op') = '=' AND (_filter->>'value') = '0' THEN
      filter_condition := ' AND total_available = 0';
    -- Handle item_number IS NOT NULL
    ELSIF (_filter->>'column') = 'item_number' AND (_filter->>'op') = 'IS NOT NULL' THEN
      filter_condition := ' AND item_number IS NOT NULL';
    -- Handle other numeric comparisons
    ELSIF (_filter->>'column') = 'total_available' AND (_filter->>'op') = '=' THEN
      filter_condition := ' AND total_available = ' || (_filter->>'value');
    -- Handle other filters as needed
    END IF;
  END IF;
  
  -- Build final query
  final_query := base_query || filter_condition;
  
  -- Add DISTINCT if needed
  IF _distinct THEN
    final_query := 'SELECT DISTINCT ON (item_number) * FROM (' || final_query || ') AS subquery ORDER BY item_number, updated_at DESC';
  END IF;
  
  -- Add LIMIT and OFFSET
  final_query := final_query || ' LIMIT ' || (_range_to - _range_from) || ' OFFSET ' || _range_from;
  
  -- Execute and return
  RETURN QUERY EXECUTE final_query;
END;
$$;


