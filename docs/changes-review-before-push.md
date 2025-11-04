# Changes Review Before Push to Main

## Generic Resource Changes

### 1. `src/lib/data/resources/index.ts`
**Change:** Added `v_tcm_tally_cards_current: tcm_tally_cards_current` to resources registry

**Why:** 
- Required for the new tally-cards resource to be accessible via API
- Matches the pattern used by other resources (e.g., `v_tcm_user_tally_card_entries`)
- Without this, `/api/v_tcm_tally_cards_current` endpoint would fail with "Unknown resource" error

**Impact:** 
- Generic - affects resource resolution system
- Safe - only adds a new resource registration
- No breaking changes

### 2. `src/components/forms/resource-view/resource-table-client.tsx`
**Change:** Fixed pageSize switching bug - detects old default (10) and updates to server's default (50)

**Why:**
- Fixes issue where URL with `pageSize=10` was overriding server default
- Prevents infinite switching between old default (10) and new default (50)
- Ensures URL syncs with server-provided default

**Impact:**
- Generic - affects all screens using ResourceTableClient
- **NOTE:** Currently hardcodes detection of old default (10) - this is acceptable for now since we're upgrading all screens from 10 to 50
- Future improvement: Could make this more generic by detecting mismatches between URL and server default dynamically

**Code Change:**
```typescript
// Detects if URL has old default (10) or is missing, updates to server default
const urlSizeNum = urlSize ? Number(urlSize) : null;
const shouldUpdateSize = urlSizeNum === null || urlSizeNum === 10;
const finalSize = shouldUpdateSize ? pageSize : nextSize;
```

### 3. `src/app/(main)/forms/stock-adjustments/page.tsx`
**Change:** Changed `defaultPageSize: 10` to `defaultPageSize: 50`

**Why:**
- User requested 50 records by default for both stock-adjustments and tally-cards
- Form-specific change (not generic)

**Impact:**
- Form-specific only
- No impact on other screens

## Form-Specific Changes (Tally Cards)
All other changes are form-specific to tally-cards:
- New form config files
- New resource configs
- New page components
- Tests

These are isolated and don't affect generic components.

## Recommendation

**Safe to push:**
- ✅ `index.ts` - Required resource registration (safe)
- ✅ `stock-adjustments/page.tsx` - Form-specific change (safe)
- ⚠️ `resource-table-client.tsx` - Generic fix but hardcodes old default (10)

**Consideration for `resource-table-client.tsx`:**
- The hardcoded check for `pageSize === 10` is a temporary fix
- It works for the current migration (10 → 50)
- Future improvement: Make it dynamic by comparing URL value to server default
- For now, it's acceptable as it fixes the immediate issue

## Summary

**Generic changes:**
1. Resource registry addition (required, safe)
2. PageSize sync fix (generic fix, works for current migration)

**Why generic changes were needed:**
- Resource registry: Required for new resource to work
- PageSize fix: Required to fix URL sync bug affecting all screens

Both changes are safe and necessary.

