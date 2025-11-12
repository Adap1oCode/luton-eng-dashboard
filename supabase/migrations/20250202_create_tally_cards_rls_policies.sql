-- ============================================================================
-- Migration: Create RLS Policies for tcm_tally_cards
-- Date: 2025-02-02
-- Purpose: Create open RLS policies for tcm_tally_cards matching tcm_user_tally_card_entries pattern
-- ============================================================================

-- Enable RLS on tcm_tally_cards if not already enabled
ALTER TABLE public.tcm_tally_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "tally_cards_delete_open" ON public.tcm_tally_cards;
DROP POLICY IF EXISTS "tally_cards_insert_open" ON public.tcm_tally_cards;
DROP POLICY IF EXISTS "tally_cards_select_open" ON public.tcm_tally_cards;
DROP POLICY IF EXISTS "tally_cards_update_open" ON public.tcm_tally_cards;

-- Policy 1: DELETE - Allow anon and authenticated users to delete
CREATE POLICY "tally_cards_delete_open"
ON public.tcm_tally_cards
FOR DELETE
TO anon, authenticated
USING (true);

-- Policy 2: INSERT - Allow anon and authenticated users to insert
CREATE POLICY "tally_cards_insert_open"
ON public.tcm_tally_cards
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy 3: SELECT - Allow anon and authenticated users to select
CREATE POLICY "tally_cards_select_open"
ON public.tcm_tally_cards
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 4: UPDATE - Allow anon and authenticated users to update
CREATE POLICY "tally_cards_update_open"
ON public.tcm_tally_cards
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);







