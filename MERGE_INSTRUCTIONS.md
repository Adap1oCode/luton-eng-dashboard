# How to Merge PR #3 - Saved Views Feature

## Quick Summary

**PR:** https://github.com/Adap1oCode/luton-eng-dashboard/pull/3  
**Status:** Ready to merge, has conflicts with main (due to main's refactoring)  
**Recommendation:** Use GitHub web UI for easiest conflict resolution

---

## Why Auto-Merge Failed

1. **GitHub CLI Limitations:** The token is read-only (cannot create/edit/merge PRs)
2. **Merge Conflicts:** Main branch did major refactoring of stock-adjustments that conflicts with our changes
3. **Complexity:** 5 files have conflicts, requiring careful resolution

---

## ✅ EASIEST WAY: GitHub Web UI

### Step 1: Open PR
Go to: https://github.com/Adap1oCode/luton-eng-dashboard/pull/3

### Step 2: Click "Resolve conflicts"
GitHub will show you a side-by-side diff editor

### Step 3: Resolve Each Conflict

#### Conflict 1: `src/lib/api/handle-list.ts`
**Resolution:** Keep BOTH approaches merged
```typescript
// Extract filters: structured (filters[col][value/mode]) + numeric (qty_gt) + custom
const filters: Record<string, any> = {};
const sp = (parsed as any).searchParams as URLSearchParams | undefined;
if (sp) {
  for (const [key, value] of sp.entries()) {
    if (['q', 'page', 'pageSize', 'activeOnly', 'raw'].includes(key)) continue;
    
    // Structured filters
    const m = key.match(/^filters\\[(.+?)\\]\\[(value|mode)\\]$/);
    if (m) {
      const col = m[1];
      const kind = m[2] as "value" | "mode";
      filters[col] = filters[col] || {};
      filters[col][kind] = value;
    }
    // Numeric filters
    else if (key.endsWith('_gt') || key.endsWith('_gte') || key.endsWith('_lt') || key.endsWith('_lte') || key.endsWith('_eq')) {
      const numValue = Number(value);
      if (Number.isFinite(numValue)) filters[key] = numValue;
    }
    // Other filters
    else {
      filters[key] = value;
    }
  }
}
```

#### Conflict 2: `src/lib/supabase/factory.ts`
**Resolution:** Keep BOTH approaches merged  
(The merged code is in PR_EVIDENCE.md - copy from there)

#### Conflict 3: `src/components/forms/resource-view/resource-table-client.tsx`
**Resolution:** Keep loading states from main + add saved views UI from our branch

For the imports section, keep BOTH:
- Main's: `FullScreenLoader`, `BackgroundLoader`
- Ours: `Dialog`, `Input`, `Label`, `ViewsMenu`, `useSavedViews`

For the component body:
- Keep main's loading props and isRefetching logic
- Add our saved views state (saveViewDialogOpen, viewName, viewDescription)
- Add our saved views hooks (useSavedViews, handleSaveViewRemote, etc.)
- Add Views dropdown to toolbar
- Add Save View dialog at the end

#### Conflict 4 & 5: Deleted Files
**Resolution:** REMOVE these files (they were deleted in main for good reason)
- `src/components/forms/stock-adjustments/stock-adjustments-client.tsx`
- `src/hooks/use-stock-adjustments.ts`

Main branch rewrote stock-adjustments to use React Query directly, so these are no longer needed.

### Step 4: Mark as Resolved
After fixing each conflict, click "Mark as resolved"

### Step 5: Commit Merge
Click "Commit merge"

### Step 6: Merge PR
Click "Merge pull request" → "Confirm merge"

---

## Alternative: Command Line Merge

If you prefer terminal:

```bash
cd /workspace
git checkout main
git pull origin main
git merge feat/saved-views-final

# Resolve conflicts in your editor
# Then:
git add -A
git commit -m "Merge PR #3: Add DB-backed saved views"
git push origin main
```

---

## What the PR Adds

✅ **Database:** `user_saved_views` table (already migrated)  
✅ **API:** 4 endpoints for CRUD operations  
✅ **UI:** Views dropdown + Save dialog  
✅ **Features:** Stable column state, silent refresh, structured filters  
✅ **Docs:** Complete documentation

**No breaking changes - purely additive!**

---

## Post-Merge Testing

After merging:
1. Visit: http://localhost:3000/forms/stock-adjustments
2. Try saving a view
3. Apply filters - columns should stay stable
4. Reload page - view should persist

---

## Need Help?

See `PR_EVIDENCE.md` for complete implementation evidence with line numbers and code snippets.
