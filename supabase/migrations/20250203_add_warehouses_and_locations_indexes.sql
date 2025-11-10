-- ============================================================================
-- Migration: Add Indexes for Warehouses and Warehouse Locations
-- Date: 2025-02-03
-- Purpose: Create performance indexes for warehouses and warehouse_locations tables
-- ============================================================================

-- ============================================================================
-- Warehouses Table Indexes
-- ============================================================================

-- Index on code (for lookups and uniqueness checks)
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(code);

-- Index on name (for search)
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON public.warehouses(name);

-- Partial index on active warehouses (most common query)
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active) 
WHERE is_active = true;

-- Index on created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_warehouses_created_at ON public.warehouses(created_at DESC);

-- ============================================================================
-- Warehouse Locations Table Indexes
-- ============================================================================

-- Index on warehouse_id (for FK lookups and warehouse scoping)
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse_id ON public.warehouse_locations(warehouse_id);

-- Index on name (for search within warehouse)
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_name ON public.warehouse_locations(name);

-- Composite index for warehouse + name lookups (common query pattern)
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse_name ON public.warehouse_locations(warehouse_id, name);

-- Partial index on active locations (most common query)
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_is_active ON public.warehouse_locations(is_active) 
WHERE is_active = true;

-- Index on created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_created_at ON public.warehouse_locations(created_at DESC);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON INDEX idx_warehouses_code IS 'Index for warehouse code lookups and uniqueness checks';
COMMENT ON INDEX idx_warehouses_name IS 'Index for warehouse name search';
COMMENT ON INDEX idx_warehouses_is_active IS 'Partial index for active warehouses only';
COMMENT ON INDEX idx_warehouses_created_at IS 'Index for sorting by creation date';

COMMENT ON INDEX idx_warehouse_locations_warehouse_id IS 'Index for warehouse FK lookups and scoping';
COMMENT ON INDEX idx_warehouse_locations_name IS 'Index for location name search';
COMMENT ON INDEX idx_warehouse_locations_warehouse_name IS 'Composite index for warehouse + name queries';
COMMENT ON INDEX idx_warehouse_locations_is_active IS 'Partial index for active locations only';
COMMENT ON INDEX idx_warehouse_locations_created_at IS 'Index for sorting by creation date';


