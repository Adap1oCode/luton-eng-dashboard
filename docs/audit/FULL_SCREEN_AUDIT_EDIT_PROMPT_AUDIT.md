# Full Screen Audit Edit Prompt - Comprehensive Audit Report

**Date**: 2025-01-29  
**File Audited**: `docs/cursor-prompts/full-screen-audit-edit.md`  
**Auditor**: Cursor AI  
**Status**: Complete

---

## Executive Summary

This audit identified **7 issues** in the prompt file:
- **2 Critical**: Inconsistencies in change count and section count
- **2 High**: Example mismatch (VIEW examples used for EDIT prompt)
- **2 Medium**: Line count inconsistencies
- **1 Low**: Minor formatting improvement

All issues are fixable with simple text edits. The prompt structure is sound, but needs corrections for accuracy and consistency.

---

## 1. File Structure & Formatting

### Findings

✅ **Markdown Syntax**: Correct  
✅ **Heading Hierarchy**: Proper H1 → H2 → H3 structure  
✅ **Code Blocks**: Properly formatted with language tags  
✅ **List Formatting**: Consistent bullet and numbered lists  
✅ **Horizontal Rules**: Properly used (`---`)

### Issues Found

**None** - File structure and formatting are correct.

---

## 2. Content Accuracy

### Route Paths Verification

✅ **Line 11**: `/forms/stock-adjustments/[id]/edit` - **VERIFIED** exists at `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`  
✅ **Line 11**: `/forms/tally-cards/[id]/edit` - **VERIFIED** exists at `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx`

### Examples Verification

❌ **CRITICAL ISSUE #1**: Examples mismatch (Lines 123-125)

**Problem**: The prompt is for **EDIT screens**, but the examples listed are from **VIEW screen audits**:

- Line 123: "Duplicate toRow" - Found in `STOCK_ADJUSTMENTS_FULL_AUDIT.md` (VIEW audit), NOT in EDIT audits
- Line 124: "Duplicate filter logic" - Found in `STOCK_ADJUSTMENTS_FULL_AUDIT.md` (VIEW audit), NOT in EDIT audits  
- Line 125: "buildColumns not memoized" - Found in `STOCK_ADJUSTMENTS_FULL_AUDIT.md` (VIEW audit), NOT in EDIT audits

**Evidence**:
- `STOCK_ADJUSTMENTS_EDIT_AUDIT.md` contains: "JSON.stringify in useEffect", "Duplicate Field Extraction", "Function Recreation", "Duplicate Sections Normalization", "buildSchema Uses Wrong Field Source"
- `STOCK_ADJUSTMENTS_TALLY_CARDS_EDIT_AUDIT.md` contains: "JSON.stringify in useEffect", "Duplicate Field Extraction", "Function Recreation", "Duplicate Sections Normalization"
- `STOCK_ADJUSTMENTS_FULL_AUDIT.md` (VIEW) contains: "Duplicate toRow", "Duplicate filter logic", "buildColumns not memoized"

**Impact**: Users following this prompt for EDIT screens will see examples that don't match their audit results, causing confusion.

**Recommendation**: Replace with EDIT-specific examples:
- "JSON.stringify in useEffect dependency array"
- "Duplicate field extraction"
- "Function recreation on every render"

---

## 3. Consistency Check

### Section Count Inconsistency

❌ **CRITICAL ISSUE #2**: Section count mismatch (Line 112)

**Problem**: 
- Line 112 says: "A 7-section Markdown report"
- But Output Format section (lines 50-82) lists **9 sections**:
  1. Runtime Trace
  2. Dependency Map
  3. Transformation Audit
  4. Payload & Query Review
  5. Hotspots Ranked
  6. 80/20 Fix Plan
  7. Guardrails & Non-Goals
  8. Summary Statistics
  9. Next Steps

**Actual Audit Reports**:
- `STOCK_ADJUSTMENTS_EDIT_AUDIT.md`: Has 9 numbered sections (1-9) plus Appendix
- `STOCK_ADJUSTMENTS_TALLY_CARDS_EDIT_AUDIT.md`: Has 10 numbered sections (1-10) plus Appendix (includes Executive Summary)

**Impact**: Misleading - users expect 7 sections but will produce 9+ sections.

**Recommendation**: Change line 112 to "A 9-section Markdown report" or "A comprehensive Markdown report with 9 main sections"

### Change Count Inconsistency

❌ **HIGH ISSUE #1**: Inconsistent change count (Lines 30 vs 72)

**Problem**:
- Line 30: "Produce an 80/20, no-regression action plan (10-15 high benefit and low risk changes), each ≤30 lines."
- Line 72: "3–6 PR-sized changes (1–10 lines each)."

**Comparison with View Prompt**:
- `full-screen-audit-view.md` line 30: "3–6 tiny changes, each ≤10 lines" - **CONSISTENT**
- `full-screen-audit-view.md` line 72: "3–6 PR-sized changes (1–10 lines each)" - **CONSISTENT**

**Actual Audit Reports**:
- `STOCK_ADJUSTMENTS_EDIT_AUDIT.md`: Has 2 PRs (PR #1: 15 lines, PR #2: 6 lines)
- `STOCK_ADJUSTMENTS_TALLY_CARDS_EDIT_AUDIT.md`: Has 1 PR (PR #1: 15 lines)

**Impact**: Confusing - users don't know which guideline to follow (10-15 changes or 3-6 changes? ≤30 lines or ≤10 lines?).

**Recommendation**: 
- Align with view prompt and actual audit results: "3–6 PR-sized changes, each ≤15 lines"
- Or clarify: Line 30 should say "3–6 high benefit changes" and line 72 should match

### Line Count Inconsistency

❌ **MEDIUM ISSUE #1**: Inconsistent line count limits (Lines 30 vs 48)

**Problem**:
- Line 30: "each ≤30 lines"
- Line 48: "Draft minimal fixes (≤10 lines each)"

**Actual Audit Reports**:
- Fixes range from 2-15 lines, with most being 3-8 lines

**Impact**: Minor confusion about acceptable fix size.

**Recommendation**: Standardize to "≤15 lines each" to match actual audit results and allow for slightly larger fixes when needed.

---

## 4. Completeness Review

### Required Sections

✅ **All 9 sections documented** in Output Format (lines 50-82):
1. ✅ Runtime Trace
2. ✅ Dependency Map
3. ✅ Transformation Audit
4. ✅ Payload & Query Review
5. ✅ Hotspots Ranked
6. ✅ 80/20 Fix Plan
7. ✅ Guardrails & Non-Goals
8. ✅ Summary Statistics
9. ✅ Next Steps

### Additional Sections in Actual Reports

**Note**: Actual audit reports include:
- **Executive Summary** (in combined audit) - Not mentioned in prompt, but acceptable
- **Appendix: Code References** - Not mentioned in prompt, but acceptable addition

**Verdict**: Prompt is complete. Additional sections in reports are enhancements, not requirements.

### Reusable Template

✅ **Template is clear** (lines 96-106):
- Provides exact format to copy/paste
- Includes placeholder `[SCREEN NAME]`
- References correct process steps
- Emphasizes "Don't assume file paths"

### "What The Output Looks Like" Section

⚠️ **MEDIUM ISSUE #2**: Section count mentioned incorrectly (see Issue #2 above)

Otherwise accurate and helpful.

---

## 5. Clarity & Usability

### Instructions Clarity

✅ **Clear and actionable**:
- "Don't assume file paths" emphasized twice (lines 7, 86)
- Discovery process is well-ordered (8 steps)
- Objectives are specific and measurable
- Rules section is comprehensive

### Discovery Process Order

✅ **Logical flow**:
1. Code sweep → 2. Trace → 3. Shape trace → 4. Find duplicates → 5. Detect churn → 6. List unused → 7. Rank hotspots → 8. Draft fixes

**Verdict**: Well-structured and easy to follow.

---

## 6. Cross-Reference Validation

### Comparison with View Prompt

**Structure Consistency**:
- ✅ Both follow same H1/H2/H3 structure
- ✅ Both have same 8-step discovery process
- ✅ Both have same 9-section output format
- ✅ Both have reusable template section

**Intentional Differences**:
- ✅ Edit prompt mentions two routes (stock-adjustments + tally-cards)
- ✅ View prompt mentions one route (stock-adjustments)
- ✅ Edit prompt says "10-15 changes" (inconsistent - see Issue #1)
- ✅ View prompt says "3-6 changes" (consistent)

**Template Format Consistency**:
- ✅ Both use same format: `[SCREEN NAME] – [Edit/View] screen`
- ✅ Both reference their respective audit process

**Verdict**: Structure is consistent. Only issue is the change count inconsistency in edit prompt.

---

## 7. Project Conventions

### CWA Alignment

✅ **Free-first mindset**: Prompt doesn't introduce paid services  
✅ **No overkill**: Focuses on minimal fixes (≤10-30 lines)  
✅ **Build once, use many times**: Reusable template section  
✅ **Zero regression**: Emphasized in "no-regression action plan" and "Guardrails & Non-Goals"  
✅ **Consultative and iterative**: "Do not implement fixes yet — produce the report only"

### PR-Based Workflow

✅ **Supports PR workflow**:
- "80/20 Fix Plan" section asks for PR-sized changes
- "Guardrails & Non-Goals" section for safety
- "Next Steps" section for confirmation

**Verdict**: Well-aligned with project conventions.

---

## 8. Issues Summary

### Critical Issues (Must Fix)

1. **Section Count Mismatch** (Line 112)
   - Says "7-section" but lists 9 sections
   - **Fix**: Change to "9-section" or "comprehensive report with 9 main sections"

2. **Change Count Inconsistency** (Lines 30, 72)
   - Line 30: "10-15 changes, ≤30 lines"
   - Line 72: "3-6 changes, ≤10 lines"
   - **Fix**: Align both to "3-6 PR-sized changes, each ≤15 lines"

### High Priority Issues (Should Fix)

3. **Examples Mismatch** (Lines 123-125)
   - Examples are from VIEW audits, not EDIT audits
   - **Fix**: Replace with EDIT-specific examples:
     - "JSON.stringify in useEffect dependency array"
     - "Duplicate field extraction"
     - "Function recreation on every render"

### Medium Priority Issues (Nice to Fix)

4. **Line Count Inconsistency** (Lines 30, 48)
   - Line 30: "≤30 lines"
   - Line 48: "≤10 lines"
   - **Fix**: Standardize to "≤15 lines" (matches actual audit results)

### Low Priority Issues (Optional)

5. **Minor**: Consider adding "Executive Summary" as optional section in Output Format (some audits include it)

---

## 9. Recommendations

### Immediate Fixes

1. **Fix section count** (Line 112):
   ```markdown
   - A 9-section Markdown report titled e.g. `EDIT_AUDIT.md` (Save under docs/audit)
   ```

2. **Fix change count consistency** (Lines 30, 72):
   ```markdown
   Produce an 80/20, no-regression action plan (3–6 high benefit and low risk changes), each ≤15 lines. Include complexity if significant rewrite.
   ```
   ```markdown
   ### 80/20 Fix Plan
   - 3–6 PR-sized changes (each ≤15 lines).
   ```

3. **Fix examples** (Lines 123-125):
   ```markdown
   That's the same process that gave you the big detailed audit with:
   
   - "JSON.stringify in useEffect dependency array"
   - "Duplicate field extraction"
   - "Function recreation on every render"
   - etc.
   ```

4. **Standardize line count** (Line 48):
   ```markdown
   8. **Draft minimal fixes** (≤15 lines each) and explain why they're safe.
   ```

### Optional Enhancements

5. Add note about Executive Summary being optional:
   ```markdown
   ### Optional: Executive Summary
   - For complex audits, include a high-level summary of key findings.
   ```

---

## 10. Verification Checklist

After fixes are applied, verify:

- [ ] Section count matches (9 sections)
- [ ] Change count is consistent (3-6 changes, ≤15 lines)
- [ ] Examples match EDIT audit findings
- [ ] Line count limits are consistent
- [ ] All route paths exist
- [ ] Template is clear and usable
- [ ] Structure matches view prompt (where appropriate)

---

## 11. Files Referenced

- `docs/cursor-prompts/full-screen-audit-edit.md` (primary file audited)
- `docs/cursor-prompts/full-screen-audit-view.md` (comparison)
- `docs/audit/STOCK_ADJUSTMENTS_EDIT_AUDIT.md` (reference)
- `docs/audit/STOCK_ADJUSTMENTS_TALLY_CARDS_EDIT_AUDIT.md` (reference)
- `STOCK_ADJUSTMENTS_FULL_AUDIT.md` (for examples verification)
- `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx` (route verification)
- `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx` (route verification)

---

**Report Generated**: 2025-01-29  
**Status**: Ready for Review  
**Next Step**: Apply recommended fixes to `docs/cursor-prompts/full-screen-audit-edit.md`















