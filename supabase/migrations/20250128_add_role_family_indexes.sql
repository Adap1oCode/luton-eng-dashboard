-- ============================================================================
-- Migration: Add Performance Indexes for role_family Column
-- Date: 2025-01-28
-- Purpose: Optimize queries for role_family-based ownership scoping
-- Impact: Improves query performance for role_family filtered queries
-- ============================================================================

-- Index for role_family ownership scoping
-- Used by: WHERE role_family = ? (ownership scoping)
CREATE INDEX IF NOT EXISTS idx_tcm_user_entries_role_family 
  ON tcm_user_tally_card_entries(role_family)
  WHERE role_family IS NOT NULL;

-- Composite index for common filter combinations with role_family
-- Used by: WHERE role_family = ? AND warehouse_id = ? ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_tcm_user_entries_role_family_warehouse_updated 
  ON tcm_user_tally_card_entries(role_family, warehouse_id, updated_at DESC)
  WHERE role_family IS NOT NULL;

-- Composite index for pagination with role_family filters
-- Used by: WHERE role_family = ? AND warehouse_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?
CREATE INDEX IF NOT EXISTS idx_tcm_user_entries_role_family_pagination 
  ON tcm_user_tally_card_entries(role_family, warehouse_id, updated_at DESC, id)
  WHERE role_family IS NOT NULL;

-- ============================================================================
-- Performance Notes:
-- 
-- These indexes target role_family-based ownership queries:
-- 1. Role family scoping: WHERE role_family = ? (ownership)
-- 2. Combined filtering: WHERE role_family = ? AND warehouse_id = ?
-- 3. Pagination: Combined filters with sorting and LIMIT/OFFSET
--
-- Note: Existing user_id indexes remain for updater queries (updated_by_user_id)
-- ============================================================================

