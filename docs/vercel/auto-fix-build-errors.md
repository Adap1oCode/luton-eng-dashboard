# Auto-Fix Vercel Build Errors

This document describes the automated workflow that checks Vercel build status daily and automatically fixes safe build errors by creating a PR.

## Overview

The `nightly-vercel-build-fix` workflow:
1. **Checks** latest Vercel deployment status (daily at 2:00 AM UTC)
2. **Detects** build failures (ERROR, BUILD_ERROR states)
3. **Fetches** build logs for failed deployments
4. **Creates** a branch (`fix/vercel-build-YYYYMMDD-HHMMSS`)
5. **Fixes** safe issues using Cursor agent (TypeScript, ESLint, imports)
6. **Creates** a PR for review
7. **Reviews** PR with AI agent (optional safety check)

## Safety Features

### ✅ Auto-Fixes (Safe)
- TypeScript compilation errors (syntax, types, missing imports)
- ESLint errors (code quality issues)
- Build configuration issues (next.config, tsconfig)
- Missing dependencies or import errors

### ⚠️ Skips (Requires Manual Review)
- Environment variable issues (require manual configuration)
- Runtime logic errors (need human review)
- Infrastructure issues (Vercel platform problems)

## Setup

### Required GitHub Secrets

**Only one secret is required:**

1. **`VERCEL_TOKEN`** ✅ **REQUIRED**
   - Get from: Vercel Dashboard → Settings → Tokens
   - Create a new token with "Full Access" scope
   - Used to access Vercel API

**Optional secrets (only if needed):**

2. **`VERCEL_TEAM_ID`** (Optional)
   - Only needed if your project is under a **team account** (not personal)
   - Get from: Vercel Dashboard → Team Settings
   - Format: `team_XXXXXXXXXXXXX`
   - If you don't have a team, leave this unset

3. **`VERCEL_PROJECT_ID`** (Optional)
   - **Defaults to your repository name automatically** (e.g., `luton-eng-dashboard`)
   - Only set this if your Vercel project name is different from your repo name
   - Most users can skip this

4. **`CURSOR_API_KEY`** ✅ **REQUIRED** (for auto-fixes)
   - Get from: Cursor Settings → API Keys
   - Used by Cursor agent to fix errors
   - You likely already have this set from the `nightly-lint` workflow

### Workflow Schedule

The workflow runs:
- **Daily at 2:00 AM UTC** (after lint workflow at 1:30 AM)
- **Manually** via GitHub Actions UI (workflow_dispatch)

## How It Works

### 1. Build Status Check

```yaml
# Uses Vercel REST API to get latest deployment
GET https://api.vercel.com/v6/deployments?projectId=PROJECT_ID&limit=1
```

Checks deployment state:
- `ERROR` / `BUILD_ERROR` → Triggers fix workflow
- `READY` / `BUILDING` → Skips (build is healthy)

### 2. Build Logs Retrieval

```yaml
# Fetches build logs for failed deployment
GET https://api.vercel.com/v2/deployments/{deployment_id}/events
```

Logs are:
- Saved to `vercel-build-logs.txt`
- Analyzed for error patterns
- Passed to Cursor agent for fixing

### 3. Branch Creation

Creates isolated branch:
```
fix/vercel-build-20250120-020000
```

All fixes are committed to this branch (never directly to `main`).

### 4. Cursor Agent Fixes

Cursor agent receives:
- Build logs with errors
- Deployment URL and ID
- Instructions to fix only safe issues

Agent fixes:
- TypeScript errors
- ESLint errors
- Import issues
- Build config problems

### 5. PR Creation

Automatically creates PR with:
- Title: `🔧 Auto-fix: Vercel build errors [YYYY-MM-DD]`
- Base: `main`
- Body: Includes deployment info and review checklist

### 6. AI Review (Optional)

After PR creation, Cursor agent reviews changes:
- Checks if changes are safe
- Identifies risky modifications
- Provides safety assessment: `SAFE_TO_MERGE`, `NEEDS_REVIEW`, or `UNSAFE`

## Reviewing Auto-Fix PRs

### Morning Review Process

1. **Check GitHub notifications** for new PRs
2. **Review PR changes**:
   - Are fixes safe and mechanical?
   - No logic changes?
   - No new features?
3. **Verify Vercel preview**:
   - PR triggers Vercel preview deployment
   - Check that preview build succeeds
4. **Merge if safe**:
   - If AI review says `SAFE_TO_MERGE` and changes look good
   - If `NEEDS_REVIEW`, review more carefully
   - If `UNSAFE`, investigate and fix manually

### PR Checklist

- [ ] Review changes for safety
- [ ] Verify build passes on Vercel preview
- [ ] Check that no functionality was broken
- [ ] Merge if changes look safe

## Troubleshooting

### Workflow Skipped

**Issue**: Workflow shows "SKIP" status

**Causes**:
- `VERCEL_TOKEN` not set in GitHub Secrets
- No deployments found for project

**Fix**:
1. Add `VERCEL_TOKEN` to GitHub Secrets (Settings → Secrets and variables → Actions)
2. Verify your Vercel project name matches your repository name (or set `VERCEL_PROJECT_ID` if different)

### No Fixes Applied

**Issue**: Build failed but no changes were made

**Causes**:
- Errors are not auto-fixable (env vars, runtime errors)
- Cursor agent couldn't fix the issues
- Build logs not accessible

**Fix**:
- Check build logs manually
- Fix issues manually or create Linear task

### PR Creation Failed

**Issue**: Branch created but PR not created

**Causes**:
- GitHub token permissions insufficient
- Branch already exists (rare)

**Fix**:
- Check workflow logs for error details
- Verify `contents: write` and `pull-requests: write` permissions

## Example Workflow Run

```
🔍 Checking latest Vercel deployment via API...
📊 Latest deployment: dpl_4bGNmCaEaUbjkcdTRMpnXQL6Nrm2
🌐 URL: https://luton-eng-dashboard.vercel.app
📈 State: ERROR
❌ Build failed - will attempt to fix

📋 Fetching build logs...
📝 Error summary saved to vercel-build-logs.txt

🌿 Creating branch: fix/vercel-build-20250120-020000
✅ Branch created

🔍 Starting Cursor agent to fix Vercel build errors...
🚀 Running cursor-agent...
✅ Cursor agent completed

✅ Changes detected - will commit and create PR
[main e934550] fix: auto-fix Vercel build errors [auto-fix]
 13 files changed, 9 insertions(+), 45 deletions(-)

✅ PR created: https://github.com/owner/repo/pull/123

🤖 Starting AI review of PR #123...
✅ AI Review: SAFE_TO_MERGE
```

## Related Documentation

- [Accessing Build Logs](./accessing-build-logs.md) - Manual process using MCP tools
- [Vercel Troubleshooting](./vercel-troubleshooting.md) - Common build issues
- [Nightly Lint Workflow](../.github/workflows/nightly-lint.yml) - Similar auto-fix for lint/TS errors

## Future Enhancements

Potential improvements:
- Auto-merge PRs if AI review says `SAFE_TO_MERGE` (with approval)
- Create Linear tasks for complex issues
- Slack/email notifications for failed builds
- Support for multiple projects

