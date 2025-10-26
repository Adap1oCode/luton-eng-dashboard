-- -----------------------------------------------------------------------------
-- FILE: scripts/add-missing-permissions.sql
-- PURPOSE: Add only the missing permissions to avoid duplicate key errors
-- USAGE: Run this script in your database to add missing permissions
-- -----------------------------------------------------------------------------

-- First, let's see what permissions already exist
SELECT key, description FROM permissions ORDER BY key;

-- Add missing permissions using INSERT ... ON CONFLICT DO NOTHING
-- This will only insert permissions that don't already exist

INSERT INTO permissions (key, description) VALUES
('menu:forms:stock_adjustments', 'Access to Stock Adjustments menu'),
('menu:dashboard:inventory', 'Access to Inventory dashboard'),
('menu:dashboard:purchase_orders', 'Access to Purchase Orders dashboard'),
('menu:dashboard:requisitions', 'Access to Requisitions dashboard'),
('resource:tcm_user_tally_card_entries:read', 'Read stock adjustments'),
('resource:tcm_user_tally_card_entries:create', 'Create stock adjustments'),
('resource:tcm_user_tally_card_entries:update', 'Update stock adjustments'),
('resource:tcm_user_tally_card_entries:delete', 'Delete stock adjustments'),
('resource:tcm_tally_cards:read', 'Read tally cards'),
('resource:tcm_tally_cards:create', 'Create tally cards'),
('resource:tcm_tally_cards:update', 'Update tally cards'),
('resource:tcm_tally_cards:delete', 'Delete tally cards'),
('admin:impersonate', 'Impersonate other users'),
('admin:manage_roles', 'Manage user roles'),
('admin:manage_users', 'Manage user accounts')
ON CONFLICT (key) DO NOTHING;

-- Verify the permissions were added
SELECT key, description FROM permissions ORDER BY key;

-- Show which permissions were actually inserted (if any)
-- This query will show permissions that were just added
WITH new_permissions AS (
  SELECT key, description FROM permissions 
  WHERE key IN (
    'menu:forms:stock_adjustments',
    'menu:dashboard:inventory',
    'menu:dashboard:purchase_orders',
    'menu:dashboard:requisitions',
    'resource:tcm_user_tally_card_entries:read',
    'resource:tcm_user_tally_card_entries:create',
    'resource:tcm_user_tally_card_entries:update',
    'resource:tcm_user_tally_card_entries:delete',
    'resource:tcm_tally_cards:read',
    'resource:tcm_tally_cards:create',
    'resource:tcm_tally_cards:update',
    'resource:tcm_tally_cards:delete',
    'admin:impersonate',
    'admin:manage_roles',
    'admin:manage_users'
  )
)
SELECT 
  key,
  description,
  CASE 
    WHEN key IN (
      'menu:forms:stock_adjustments',
      'menu:dashboard:inventory',
      'menu:dashboard:purchase_orders',
      'menu:dashboard:requisitions',
      'resource:tcm_user_tally_card_entries:read',
      'resource:tcm_user_tally_card_entries:create',
      'resource:tcm_user_tally_card_entries:update',
      'resource:tcm_user_tally_card_entries:delete',
      'resource:tcm_tally_cards:read',
      'resource:tcm_tally_cards:create',
      'resource:tcm_tally_cards:update',
      'resource:tcm_tally_cards:delete',
      'admin:impersonate',
      'admin:manage_roles',
      'admin:manage_users'
    ) THEN 'Available'
    ELSE 'Missing'
  END as status
FROM new_permissions
ORDER BY key;

