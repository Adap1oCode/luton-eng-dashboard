-- Updated get_inventory_rows RPC function to handle warehouse + missing cost filtering
-- This is a simpler approach than multiple filters

CREATE OR REPLACE FUNCTION get_inventory_rows(
  _filter jsonb DEFAULT NULL,
  _distinct boolean DEFAULT false,
  _range_from integer DEFAULT 0,
  _range_to integer DEFAULT 100
)
RETURNS SETOF inventory
LANGUAGE plpgsql
AS $function$
DECLARE
  sql_text text;
  lim integer := _range_to - _range_from + 1;
  where_clause text := '';
  filter_column text;
  filter_op text;
  filter_value text;
BEGIN
  -- Start with base query
  sql_text := 'SELECT ';
  
  -- Add DISTINCT if needed
  IF COALESCE(_distinct, false) THEN
    sql_text := sql_text || 'DISTINCT ';
  END IF;
  
  sql_text := sql_text || '* FROM inventory';
  
  -- Build WHERE clause - always start with is_deleted = false
  where_clause := ' WHERE is_deleted = false';
  
  -- Build filter condition if filter exists
  IF _filter IS NOT NULL AND (_filter ? 'column') THEN
    filter_column := _filter->>'column';
    filter_op := _filter->>'op';
    filter_value := _filter->>'value';
    
    -- Handle special case for warehouse + missing cost filtering
    IF filter_column = 'warehouse_and_missing_cost' THEN
      where_clause := where_clause || ' AND warehouse = ' || quote_literal(filter_value) || 
                     ' AND (item_cost = 0 OR item_cost IS NULL)';
    ELSE
      -- Handle regular filters
      CASE filter_op
        WHEN '=' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' = ' || quote_literal(filter_value);
        WHEN '!=' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' != ' || quote_literal(filter_value);
        WHEN '>' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' > ' || quote_literal(filter_value);
        WHEN '>=' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' >= ' || quote_literal(filter_value);
        WHEN '<' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' < ' || quote_literal(filter_value);
        WHEN '<=' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' <= ' || quote_literal(filter_value);
        WHEN 'IS NOT NULL' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' IS NOT NULL';
        WHEN 'IS NULL' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' IS NULL';
        WHEN 'LIKE' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' LIKE ' || quote_literal(filter_value);
        WHEN 'ILIKE' THEN
          where_clause := where_clause || ' AND ' || quote_ident(filter_column) || ' ILIKE ' || quote_literal(filter_value);
        ELSE
          RAISE EXCEPTION 'Unsupported operator: %', filter_op;
      END CASE;
    END IF;
  END IF;
  
  -- Add ordering and pagination
  sql_text := sql_text || where_clause || ' ORDER BY item_number LIMIT ' || lim || ' OFFSET ' || _range_from;
  
  -- Debug logging
  RAISE NOTICE 'Generated SQL: %', sql_text;
  
  -- Execute the query
  RETURN QUERY EXECUTE sql_text;
END;
$function$;

