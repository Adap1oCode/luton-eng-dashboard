-- Fixed version of get_inventory_rows RPC function
-- The issue was in the SQL generation logic

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
    
    -- Add the filter condition
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
    
    sql_text := sql_text || where_clause;
  ELSE
    -- No filter, just add the basic WHERE clause
    sql_text := sql_text || ' WHERE is_deleted = false';
  END IF;
  
  -- Add ORDER BY for DISTINCT
  IF COALESCE(_distinct, false) THEN
    sql_text := sql_text || ' ORDER BY item_number, updated_at DESC';
  END IF;
  
  -- Add LIMIT and OFFSET
  sql_text := sql_text || ' OFFSET ' || _range_from || ' LIMIT ' || lim;
  
  -- Debug: Log the SQL being executed
  RAISE NOTICE 'get_inventory_rows will execute: %', sql_text;
  
  -- Execute the query
  RETURN QUERY EXECUTE sql_text;
END;
$function$;