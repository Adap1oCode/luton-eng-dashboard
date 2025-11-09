# SCD2 Config Fix Migration - Quick Guide

## Can I Run It All At Once?

**Yes!** The entire migration is safe to run all at once. It's designed to be **idempotent** (safe to run multiple times).

## What Each Step Does

| Step | What It Does | Can Skip? |
|------|--------------|-----------|
| **Step 1** | Diagnostic - shows what's in config table | ✅ Yes (just info) |
| **Step 2** | **Re-registers resources** (UPSERT) | ❌ **No - This is the fix!** |
| **Step 3** | **Updates config getter function** (more robust) | ❌ **No - This is the fix!** |
| **Step 4** | Verification - tests if it works | ✅ Yes (just verification) |
| **Step 5** | Shows final state | ✅ Yes (just info) |

## Minimum Required Steps

If you want to run **only the essential parts**, run:

### Option A: Just the Fix (Steps 2 + 3)

```sql
-- Step 2: Re-register Resources
SELECT public.fn_scd2_register_resource(
  'public.tcm_user_tally_card_entries',
  'tally_card_number',
  'updated_at',
  true,
  '[
    {"name":"updated_by_user_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"qty","type":"integer","normalize":"none"},
    {"name":"location","type":"text","normalize":"lower_trim"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"role_family","type":"text","normalize":"lower_trim"},
    {"name":"reason_code","type":"text","normalize":"lower_trim","default":"unspecified"},
    {"name":"multi_location","type":"boolean","normalize":"none","default":"false"}
  ]'::jsonb,
  ARRAY['updated_by_user_id', 'card_uid', 'hashdiff']::text[]
);

SELECT public.fn_scd2_register_resource(
  'public.tcm_tally_cards',
  'card_uid',
  'snapshot_at',
  false,
  '[
    {"name":"card_uid","type":"uuid","normalize":"none"},
    {"name":"warehouse_id","type":"uuid","normalize":"none"},
    {"name":"tally_card_number","type":"text","normalize":"lower_trim"},
    {"name":"item_number","type":"bigint","normalize":"none"},
    {"name":"note","type":"text","normalize":"lower_trim"},
    {"name":"is_active","type":"boolean","normalize":"none","default":"true"}
  ]'::jsonb,
  ARRAY['card_uid', 'hashdiff']::text[]
);

-- Step 3: Update Config Getter Function
CREATE OR REPLACE FUNCTION public.fn_scd2_get_config(p_table regclass)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  v_table_text text;
  v_config jsonb;
  v_table_name_only text;
BEGIN
  v_table_text := p_table::text;
  
  SELECT row_to_json(c.*)::jsonb INTO v_config
  FROM public.scd2_resource_config c
  WHERE c.table_name = v_table_text;
  
  IF v_config IS NULL THEN
    v_table_name_only := substring(v_table_text from '\.([^.]+)$');
    
    SELECT row_to_json(c.*)::jsonb INTO v_config
    FROM public.scd2_resource_config c
    WHERE c.table_name = v_table_name_only
       OR c.table_name = 'public.' || v_table_name_only;
  END IF;
  
  IF v_config IS NULL AND v_table_text NOT LIKE 'public.%' THEN
    SELECT row_to_json(c.*)::jsonb INTO v_config
    FROM public.scd2_resource_config c
    WHERE c.table_name = 'public.' || v_table_text;
  END IF;
  
  RETURN v_config;
END;
$$;
```

### Option B: Full Migration (Recommended)

**Just run the entire file** - it includes verification so you'll know if it worked.

## Recommended Approach

**Run the entire migration file** because:

1. ✅ **It's safe** - All operations are idempotent (UPSERT, CREATE OR REPLACE)
2. ✅ **Includes verification** - You'll see success messages
3. ✅ **Includes diagnostics** - Shows what was wrong/fixed
4. ✅ **One command** - Copy-paste the whole file and execute

## How to Run

### In Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Copy the **entire contents** of `supabase/migrations/20250202_fix_scd2_config_lookup.sql`
3. Paste into SQL Editor
4. Click "Run" (or press Ctrl+Enter)
5. Check the output messages - you should see:
   - `✓ Config lookup SUCCESS for public.tcm_user_tally_card_entries`
   - `✓ Config lookup SUCCESS for public.tcm_tally_cards`

### Via Supabase CLI:

```bash
supabase migration up 20250202_fix_scd2_config_lookup
```

## After Running

1. **Refresh your browser** (or restart Next.js if needed)
2. **Try editing a stock adjustment** - should work now!

## What Changed?

The only **actual changes** are:

1. **Config table gets populated** (if it was empty)
2. **Config getter function becomes more robust** (handles schema prefix variations)

Everything else is just diagnostics/verification.



