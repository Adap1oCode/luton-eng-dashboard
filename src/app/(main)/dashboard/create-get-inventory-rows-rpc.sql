-- Create the get_inventory_rows RPC function
-- This function handles filtering and pagination for inventory data

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
  query_text text;
  where_clause text := 'WHERE is_deleted = false';
  order_clause text := 'ORDER BY item_number';
BEGIN
  -- Build WHERE clause based on filter
  IF _filter IS NOT NULL THEN
    -- Handle different filter types
    IF _filter->>'column' IS NOT NULL AND _filter->>'op' IS NOT NULL THEN
      IF _filter->>'op' = '=' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' = ' || quote_literal(_filter->>'value');
      ELSIF _filter->>'op' = 'IS NOT NULL' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' IS NOT NULL';
      ELSIF _filter->>'op' = '>' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' > ' || quote_literal(_filter->>'value');
      ELSIF _filter->>'op' = '<' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' < ' || quote_literal(_filter->>'value');
      ELSIF _filter->>'op' = '>=' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' >= ' || quote_literal(_filter->>'value');
      ELSIF _filter->>'op' = '<=' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' <= ' || quote_literal(_filter->>'value');
      ELSIF _filter->>'op' = 'LIKE' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' LIKE ' || quote_literal('%' || (_filter->>'value') || '%');
      ELSIF _filter->>'op' = 'ILIKE' THEN
        where_clause := where_clause || ' AND ' || (_filter->>'column') || ' ILIKE ' || quote_literal('%' || (_filter->>'value') || '%');
      END IF;
    END IF;
  END IF;

  -- Build the main query
  IF _distinct THEN
    query_text := 'SELECT DISTINCT ON (item_number) * FROM inventory ' || where_clause || ' ' || order_clause || ', updated_at DESC';
  ELSE
    query_text := 'SELECT * FROM inventory ' || where_clause || ' ' || order_clause;
  END IF;

  -- Add LIMIT and OFFSET
  query_text := query_text || ' LIMIT ' || (_range_to - _range_from) || ' OFFSET ' || _range_from;

  -- Execute the query
  RETURN QUERY EXECUTE query_text;
END;
$$;


