-- Add warehouse + missing cost support to existing get_inventory_rows RPC function
-- This adds special case handling for warehouse_and_missing_cost filter

CREATE OR REPLACE FUNCTION get_inventory_rows(
  _filter jsonb DEFAULT NULL,
  _distinct boolean DEFAULT false,
  _range_from integer DEFAULT 0,
  _range_to integer DEFAULT 999
)
RETURNS SETOF inventory
LANGUAGE plpgsql
AS $function$
DECLARE
  sql_text text;
  lim integer := _range_to - _range_from + 1;
  where_clause text := '';
BEGIN
  -- Start with base query
  sql_text := 'SELECT ';
  
  -- Add DISTINCT if needed
  IF COALESCE(_distinct, false) THEN
    sql_text := sql_text || 'DISTINCT ';
  END IF;
  
  sql_text := sql_text || '* FROM inventory';
  
  -- Build WHERE clause if filter exists
  IF _filter IS NOT NULL AND (_filter ? 'column') THEN
    where_clause := ' WHERE is_deleted = false';
    
    -- Special case for warehouse + missing cost filtering
    IF _filter->>'column' = 'warehouse_and_missing_cost' THEN
      where_clause := where_clause || ' AND warehouse = ' || quote_literal(_filter->>'value') || 
                     ' AND (item_cost = 0 OR item_cost IS NULL)';
    ELSE
      -- Regular filter handling
      IF (_filter ? 'column') AND (_filter ? 'op') THEN
        where_clause := where_clause || ' AND ' || quote_ident(_filter->>'column');
        
        -- Handle different operators
        IF _filter->>'op' = '=' THEN
          where_clause := where_clause || ' = ' || quote_literal(_filter->>'value');
        ELSIF _filter->>'op' = '>' THEN
          where_clause := where_clause || ' > ' || quote_literal(_filter->>'value');
        ELSIF _filter->>'op' = '<' THEN
          where_clause := where_clause || ' < ' || quote_literal(_filter->>'value');
        ELSIF _filter->>'op' = '>=' THEN
          where_clause := where_clause || ' >= ' || quote_literal(_filter->>'value');
        ELSIF _filter->>'op' = '<=' THEN
          where_clause := where_clause || ' <= ' || quote_literal(_filter->>'value');
        ELSIF _filter->>'op' = 'IS NOT NULL' THEN
          where_clause := where_clause || ' IS NOT NULL';
        ELSIF _filter->>'op' = 'IS NULL' THEN
          where_clause := where_clause || ' IS NULL';
        ELSIF _filter->>'op' = 'LIKE' THEN
          where_clause := where_clause || ' LIKE ' || quote_literal('%' || (_filter->>'value') || '%');
        ELSIF _filter->>'op' = 'ILIKE' THEN
          where_clause := where_clause || ' ILIKE ' || quote_literal('%' || (_filter->>'value') || '%');
        END IF;
      END IF;
    END IF;
    
    sql_text := sql_text || where_clause;
  ELSE
    -- No filter, just add the basic WHERE clause
    sql_text := sql_text || ' WHERE is_deleted = false';
  END IF;
  
  -- Add ORDER BY and LIMIT
  sql_text := sql_text || ' ORDER BY item_number LIMIT ' || lim || ' OFFSET ' || _range_from;
  
  -- Debug: Log the generated SQL
  RAISE NOTICE 'Generated SQL: %', sql_text;
  
  -- Execute and return
  RETURN QUERY EXECUTE sql_text;
END;
$function$;

