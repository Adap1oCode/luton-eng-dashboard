# Branch Cleanup and Merge Guide

This guide provides step-by-step instructions for reviewing, merging, and cleaning up branches that haven't been committed to in the last 7 days. This process ensures a clean main branch and successful Vercel builds.

## Prerequisites

- Git repository access
- Node.js and npm installed
- All dependencies installed (`npm install`)
- Access to push to `origin/main`

## Overview

This process:
1. Identifies branches from the last 7 days
2. Checks merge status against main
3. Prompts for merge decisions
4. Merges approved branches
5. Deletes unmerged/unneeded branches
6. Runs CI verification
7. Ensures clean Vercel build

---

## Step-by-Step Process

### Step 1: Review All Branches from Last 7 Days

First, identify all branches that have commits from the last 7 days:

```bash
# Get current date context
Get-Date -Format "yyyy-MM-dd"

# List all remote branches with commit dates
git for-each-ref --format='%(refname:short)|%(committerdate:short)|%(authorname)|%(subject)' refs/remotes/origin --sort=-committerdate

# Filter branches from last 7 days
git log --all --since="7 days ago" --format="%h|%an|%ad|%s" --date=short --decorate
```

### Step 2: Check Merge Status

Determine which branches have been merged into main:

```bash
# List all remote branches that ARE merged into main
git branch -r --merged main

# List all remote branches that are NOT merged into main
git branch -r --no-merged main

# For each unmerged branch, check what commits are unique
git log main..origin/<branch-name> --oneline
```

### Step 3: Identify Branches to Review

Create a summary of branches from the last 7 days that are NOT merged:

```bash
# Get detailed info about unmerged branches
git for-each-ref --format='%(refname:short)|%(committerdate:short)|%(authorname)|%(subject)' refs/remotes/origin --sort=-committerdate | Select-String -Pattern "$(Get-Date -Format 'yyyy-MM-dd' -AddDays -7)"
```

**Example Output Format:**
```
Branch Name | Last Commit Date | Author | Subject | Commits Ahead of Main
-----------|------------------|--------|---------|----------------------
origin/feat/example | 2025-11-12 | User | feat: example | 3 commits
```

### Step 4: Review and Decide on Each Branch

For each unmerged branch from the last 7 days:

1. **Review the commits:**
   ```bash
   git log main..origin/<branch-name> --oneline
   ```

2. **Check branch purpose and age:**
   - Is it older than 7 days but still relevant?
   - Does it contain work that should be merged?
   - Is it obsolete or superseded?

3. **Decision Matrix:**
   - **MERGE**: Contains valuable work that should be in main
   - **DELETE**: Obsolete, experimental, or superseded
   - **KEEP**: Still in active development (leave for now)

### Step 5: Commit Any Unstaged Changes

Before merging, ensure working directory is clean:

```bash
# Check status
git status

# Stage all changes (modified + untracked)
git add -A

# Review what will be committed
git status --short

# Commit with descriptive message
git commit -m "chore: commit unstaged changes before branch merges"
```

**Note:** If pre-commit hook fails with TypeScript/lint errors, fix them before proceeding.

### Step 6: Merge Branches (Oldest to Newest)

Merge branches in chronological order (oldest first) to minimize conflicts:

```bash
# Merge branch 1 (oldest)
git merge origin/<branch-name-1> --no-ff -m "merge: origin/<branch-name-1> - <description>"

# If conflicts occur, resolve them:
# 1. Check conflicted files: git status
# 2. Resolve conflicts in each file
# 3. Stage resolved files: git add <file>
# 4. Complete merge: git commit -m "merge: ..."

# Merge branch 2
git merge origin/<branch-name-2> --no-ff -m "merge: origin/<branch-name-2> - <description>"

# Continue for all approved branches...
```

**Merge Conflict Resolution Tips:**
- Use `git checkout --theirs <file>` to accept incoming changes when appropriate
- Use `git checkout --ours <file>` to keep current changes
- Manually resolve when both sides have valuable changes
- Always test after resolving conflicts

### Step 7: Delete Unmerged/Unneeded Branches

Delete branches that were not merged:

```bash
# Delete remote branch
git push origin --delete <branch-name>

# Delete local branch (if it exists)
git branch -D <branch-name>
```

**Example:**
```bash
git push origin --delete fix/test-failures-M1
git branch -D fix/test-failures-M1
```

### Step 8: Clean Up Local Branches

Remove local branches that are at the same point as main:

```bash
# List local branches
git branch -vv

# Check if branch has unique commits
git log main..<local-branch> --oneline

# If empty (no unique commits), delete it
git branch -d <local-branch>

# Force delete if needed (use with caution)
git branch -D <local-branch>
```

### Step 9: Fix Any Build Errors

After merging, check for build issues:

```bash
# Run typecheck
npm run typecheck

# Run lint
npm run lint

# Run production build
npm run build
```

**Common Build Errors and Fixes:**

1. **TypeScript Errors:**
   - Missing properties in types → Add to type definitions
   - Duplicate identifiers → Remove duplicates
   - Import errors → Fix import paths

2. **Next.js Build Errors:**
   - `useSearchParams()` without Suspense → Wrap in `<Suspense>` boundary
   - Server/client boundary issues → Inline values or make component client-side
   - Missing dependencies → Add to imports

3. **Example Fixes:**
   ```typescript
   // Fix: Wrap RouteLoaderBridge in Suspense
   <Suspense fallback={null}>
     <RouteLoaderBridge />
   </Suspense>
   
   // Fix: Inline client function calls in server components
   // Instead of: const copy = resolveLoaderMessage("auth:loading");
   const copy = {
     title: "Authorizing…",
     message: "Confirming your session…",
     variant: "blocking" as const,
   };
   ```

### Step 10: Run CI Verification

Run the full CI verification pipeline:

```bash
# Full verification (includes build and health checks)
npm run ci:verify

# Or with flags for faster iteration:
npm run ci:verify -- --fast              # Skip build and health check
npm run ci:verify -- --no-build          # Skip build only
npm run ci:verify -- --no-health-check   # Skip health check only
```

**Expected Output:**
```
================================================================
  CI VERIFICATION (Cursor Working Agreement)
================================================================

Static analysis (parallel x2)
▶ TypeScript typecheck (parallel)
▶ ESLint (parallel)
✓ TypeScript typecheck completed
✓ ESLint completed

Unit tests
▶ Vitest unit tests
✓ Vitest unit tests completed

Build & artifact verification
▶ Next.js production build
✓ Build completed
✓ Verify build artifacts

HTTP health checks
▶ Health-check critical routes
✓ All health check routes passed

✅ ALL CI VERIFICATION STEPS PASSED
```

### Step 11: Push to Main

Once all checks pass, push to main:

```bash
# Check current status
git status

# Push to origin/main
git push origin main

# If pre-push hook fails, you can bypass (not recommended):
# SKIP_VERIFY=1 git push origin main
```

**Note:** The pre-push hook will automatically run `npm run ci:verify`. Only bypass in emergencies.

### Step 12: Verify Vercel Build

After pushing, verify Vercel deployment:

1. **Check Vercel Dashboard:**
   - Navigate to your Vercel project
   - Verify the latest deployment is building/succeeded
   - Check build logs for any errors

2. **Verify Preview URL:**
   - Click on the deployment
   - Test the preview URL
   - Verify critical routes work:
     - `/` (home)
     - `/dashboard/inventory`
     - `/forms/stock-adjustments`
     - `/api/me/role`

3. **If Build Fails:**
   - Review Vercel build logs
   - Fix issues locally
   - Re-run `npm run build` to verify
   - Push fixes to main

---

## Complete Example Workflow

Here's a complete example of the entire process:

```bash
# 1. Review branches
git for-each-ref --format='%(refname:short)|%(committerdate:short)|%(authorname)|%(subject)' refs/remotes/origin --sort=-committerdate

# 2. Check merge status
git branch -r --no-merged main

# 3. Review specific branch
git log main..origin/feat/example --oneline

# 4. Commit unstaged changes
git add -A
git commit -m "chore: commit unstaged changes before branch merges"

# 5. Merge branches (oldest first)
git merge origin/feat/oldest-branch --no-ff -m "merge: origin/feat/oldest-branch - Description"
# Resolve conflicts if any, then:
git add <resolved-files>
git commit -m "merge: origin/feat/oldest-branch - Description"

git merge origin/feat/newer-branch --no-ff -m "merge: origin/feat/newer-branch - Description"

# 6. Delete unmerged branches
git push origin --delete fix/obsolete-branch
git branch -D fix/obsolete-branch

# 7. Clean up local branches
git branch -d feat/local-branch

# 8. Fix build errors
npm run typecheck
npm run lint
npm run build

# 9. Run CI verification
npm run ci:verify

# 10. Push to main
git push origin main

# 11. Verify Vercel build (check dashboard)
```

---

## Troubleshooting

### Windows-Specific Issues

**Problem:** `spawn EINVAL` error when running `npm run ci:verify`

**Solution:** The script should now handle Windows automatically. If issues persist:
- Ensure you're using the latest version of `scripts/ci-verify.mjs`
- The script uses `shell: true` for `.cmd` files on Windows

### Merge Conflicts

**Problem:** Multiple merge conflicts

**Solution:**
1. Use `git status` to see all conflicted files
2. Resolve each conflict:
   - Accept theirs: `git checkout --theirs <file>`
   - Accept ours: `git checkout --ours <file>`
   - Manual edit: Open file and resolve `<<<<<<< HEAD` markers
3. Stage resolved files: `git add <file>`
4. Complete merge: `git commit`

### Build Failures

**Problem:** Build fails after merge

**Solution:**
1. Check error message in build output
2. Common fixes:
   - TypeScript errors → Fix type definitions
   - Missing Suspense → Wrap `useSearchParams()` calls
   - Server/client boundary → Inline values or add "use client"
3. Test locally: `npm run build`
4. Fix and commit: `git add . && git commit -m "fix: <description>"`

### Pre-Push Hook Failures

**Problem:** Pre-push hook fails

**Solution:**
1. Run verification manually: `npm run ci:verify`
2. Fix any failures
3. Try pushing again
4. Only bypass in emergencies: `SKIP_VERIFY=1 git push origin main`

---

## Automation Script (Optional)

You can create a PowerShell script to automate parts of this process:

```powershell
# branch-cleanup.ps1
# Review branches from last 7 days
$sevenDaysAgo = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
Write-Host "Branches with commits since $sevenDaysAgo:"
git for-each-ref --format='%(refname:short)|%(committerdate:short)|%(authorname)|%(subject)' refs/remotes/origin --sort=-committerdate | Where-Object { $_ -match $sevenDaysAgo }

Write-Host "`nUnmerged branches:"
git branch -r --no-merged main

Write-Host "`nReview each branch with: git log main..origin/<branch> --oneline"
```

---

## Schedule Recommendations

**Recommended Frequency:**
- **Weekly**: Review and clean up branches every Monday
- **Before Major Releases**: Always run before deploying to production
- **After Feature Freezes**: Clean up before starting new sprint

**Time Estimate:**
- Quick review (no merges): 5-10 minutes
- With merges: 15-30 minutes
- With conflicts: 30-60 minutes

---

## Checklist

Use this checklist to ensure nothing is missed:

- [ ] Review all branches from last 7 days
- [ ] Check merge status of each branch
- [ ] Decide which branches to merge/delete/keep
- [ ] Commit any unstaged changes
- [ ] Merge approved branches (oldest first)
- [ ] Resolve any merge conflicts
- [ ] Delete unmerged/unneeded branches
- [ ] Clean up local branches
- [ ] Run `npm run typecheck` - passes
- [ ] Run `npm run lint` - passes
- [ ] Run `npm run build` - passes
- [ ] Run `npm run ci:verify` - passes
- [ ] Push to `origin/main`
- [ ] Verify Vercel build succeeds
- [ ] Test preview URL
- [ ] Document any issues encountered

---

## Notes

- Always merge oldest branches first to minimize conflicts
- Use `--no-ff` flag to preserve branch history
- Never force push to main
- Always run CI verification before pushing
- Keep main branch deployable at all times
- Document any manual interventions or bypasses

---

## Related Documentation

- [Cursor Working Agreement](../cursor/working-agreement.md)
- [CI Verification Script](../../scripts/ci-verify.mjs)
- [Vercel Deployment Guide](../vercel/accessing-build-logs.md)

