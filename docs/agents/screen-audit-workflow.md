# Automated Screen Performance Audit Workflow

This document describes the automated workflow that performs comprehensive performance audits of screens and automatically fixes high-value issues.

## Overview

The `nightly-screen-audit` workflow:
1. **Runs** a comprehensive discovery audit of a screen (e.g., Stock Adjustments View)
2. **Analyzes** the audit report to identify high-value, low-risk fixes
3. **Auto-fixes** only safe, beneficial changes (if enabled)
4. **Creates** a PR with the full audit report and fixes

## What Gets Audited

The audit follows the process from `docs/cursor-prompts/full-screen-audit-view.md`:

### Runtime Trace
- Maps the complete flow: Route → SSR → API → DB → Client → Table
- Records data shapes at each hop
- Identifies transformations and caching

### Waste Detection
- Duplicate transformations
- Props/state churn
- Wide payloads
- N+1 reads
- Double pagination conversions
- Re-created column defs
- Deep clones
- JSON stringify/parse loops
- Unstable keys
- Excessive memo/effect usage
- Client-side filtering duplicates
- URL-sync feedback loops

### Output
- **Runtime Trace**: Complete flow with file:line references
- **Dependency Map**: Module relationships, unused code
- **Transformation Audit**: Every mapping/coercion
- **Payload Review**: Columns vs API fields, N+1 issues
- **Hotspots Ranked**: File:line → issue → cost → fix
- **80/20 Fix Plan**: 3-6 tiny changes (≤10 lines each)
- **Summary Statistics**: Duplicates, conversions, expected gains

## Safety & Value Filtering

Only fixes that meet **ALL** criteria are auto-applied:

1. ✅ **HIGH or MEDIUM impact** (performance/clarity benefit)
2. ✅ **LOW risk** (safe to auto-apply)
3. ✅ **Clear benefit** (adds clarity or improves performance)
4. ✅ **≤10 lines** (small, focused changes)
5. ✅ **Auto-fixable** (mechanical, not requiring context)

## Workflow Steps

### Agent 1: Run Full Audit
- Uses the audit prompt template
- Discovers all related files
- Traces runtime path
- Identifies waste and hotspots
- Produces markdown report: `reports/audits/{screen}-audit-{date}.md`

### Agent 2: Analyze & Filter
- Reads audit report
- Identifies top 3-5 high-value fixes
- Filters by impact/risk criteria
- Outputs selected fixes in structured format

### Agent 3: Auto-Fix (if enabled)
- Applies only selected fixes
- Makes exact code changes as specified
- Verifies files exist before changing
- Skips fixes if files missing

### Create PR
- Includes full audit report
- Shows key hotspots and fix plan
- Lists auto-fixes applied (if any)

### Agent 4: Code Review
- Reviews PR changes for safety
- Checks if fixes match audit recommendations
- Verifies no functionality broken
- Outputs: APPROVED, NEEDS_CHANGES, or REJECTED

### Agent 5: Post Review
- Posts code review as PR comment
- Creates GitHub PR review (approve/request changes)
- Provides detailed feedback

### Agent 6: Auto-Merge (if enabled)
- If code review is APPROVED and auto_merge is enabled
- Waits for CI checks to start
- Merges PR automatically (squash merge)
- Posts merge confirmation comment

## Usage

### Scheduled (Daily)
Runs automatically every day at 3:00 AM UTC, auditing `stock-adjustments` by default.

### Manual Trigger
Go to Actions → "Nightly Screen Performance Audit" → "Run workflow"

**Inputs:**
- `screen_name`: Screen to audit (e.g., `stock-adjustments`, `requisitions`) - default: `stock-adjustments`
- `auto_fix`: Whether to auto-fix high-value issues (default: `true`)
- `auto_merge`: Whether to auto-merge if code review passes (default: `true`)

### Example Manual Runs

```yaml
# Audit stock-adjustments with auto-fix
screen_name: stock-adjustments
auto_fix: true

# Audit requisitions, report only (no fixes)
screen_name: requisitions
auto_fix: false
```

## Output Files

### Audit Report
```
reports/audits/stock-adjustments-audit-20250120.md
```

Contains:
- Complete runtime trace
- Dependency map
- Transformation audit
- Hotspots ranked
- 80/20 fix plan
- Summary statistics

### PR Contents
- **Title**: `🔍 Audit: {screen} performance optimization [YYYY-MM-DD]`
- **Body**: 
  - Key hotspots summary
  - 80/20 fix plan
  - Summary statistics
  - Full audit report (collapsed)
  - Review checklist

## Review Process

### Morning Review

1. **Check PR notifications**
2. **Review audit report**:
   - Are findings accurate?
   - Are hotspots correctly identified?
   - Is the 80/20 plan reasonable?
3. **Verify auto-fixes** (if any):
   - Are changes safe?
   - Do they match the fix plan?
   - No functionality broken?
4. **Test performance**:
   - Run the screen locally
   - Check for improvements
   - Verify no regressions
5. **Merge if safe**

### PR Checklist

- [ ] Audit findings are accurate
- [ ] Auto-fixes (if any) are safe
- [ ] Performance improvements verified
- [ ] No functionality broken
- [ ] Ready to merge

## Example Workflow Run

```
🔍 Agent 1: Running full discovery audit for stock-adjustments...
🚀 Running cursor-agent for audit...
✅ Audit report created: reports/audits/stock-adjustments-audit-20250120.md

📊 Agent 2: Analyzing audit report and filtering high-value fixes...
🚀 Running cursor-agent for analysis...
✅ High-value fixes identified

🔧 Agent 3: Auto-fixing high-value issues...
🚀 Running cursor-agent to apply fixes...
✅ Changes detected

🌿 Creating branch: audit/stock-adjustments-20250120-030000
✅ Branch created

✅ PR created: https://github.com/owner/repo/pull/123

🔍 Agent 4: Starting code review of PR #123...
🚀 Running cursor-agent for code review...
✅ Code Review: APPROVED

✅ Posted code review to PR #123
✅ Approved PR #123

🚀 Auto-merging PR #123...
✅ Successfully merged PR #123
```

## Supported Screens

Any screen following the resource pattern:
- `stock-adjustments`
- `requisitions`
- `purchase-orders`
- `tally-cards`
- etc.

The audit automatically discovers files for any screen name.

## Limitations

1. **Audit Scope**: Only audits the "View" screen (list/table view)
2. **Fix Size**: Only fixes ≤10 lines each
3. **Risk Threshold**: Only LOW risk fixes are auto-applied
4. **Impact Threshold**: Only HIGH/MEDIUM impact fixes
5. **File Discovery**: Relies on Cursor agent to find files (may miss if structure differs)

## Future Enhancements

Potential improvements:
- Audit multiple screens in parallel
- Create Linear tasks for complex fixes
- Auto-merge PRs if all checks pass
- Performance benchmarking before/after
- Track audit history over time

## Related Documentation

- [Full Screen Audit Prompt](../cursor-prompts/full-screen-audit-view.md) - Original audit template
- [Stock Adjustments Files](../forms/stock-adjustments-files-sitemap.md) - File structure reference
- [Multi-Agent Orchestration](./multi-agent-orchestration.md) - How agents work together

