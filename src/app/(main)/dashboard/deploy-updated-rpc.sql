-- Updated RPC function with better DISTINCT handling
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
  
  -- Add ORDER BY and LIMIT
  sql_text := sql_text || ' ORDER BY item_number LIMIT ' || lim || ' OFFSET ' || _range_from;
  
  -- Debug: Log the generated SQL
  RAISE NOTICE 'Generated SQL: %', sql_text;
  
  -- Execute and return
  RETURN QUERY EXECUTE sql_text;
END;
$function$;

-- Function to get total count for inventory rows with filters
CREATE OR REPLACE FUNCTION get_inventory_count(
  _filter jsonb DEFAULT NULL,
  _distinct boolean DEFAULT false
)
RETURNS bigint
LANGUAGE plpgsql
AS $function$
DECLARE
  sql_text text;
  where_clause text := '';
  result_count bigint;
BEGIN
  -- Start with base query
  IF COALESCE(_distinct, false) THEN
    sql_text := 'SELECT COUNT(DISTINCT item_number) FROM inventory';
  ELSE
    sql_text := 'SELECT COUNT(*) FROM inventory';
  END IF;
  
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
  
  -- Debug: Log the generated SQL
  RAISE NOTICE 'Count SQL: %', sql_text;
  
  -- Execute and return
  EXECUTE sql_text INTO result_count;
  RETURN result_count;
END;
$function$;
