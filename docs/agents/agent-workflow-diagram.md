# Multi-Agent Workflow: Visual Guide

## Current Vercel Build Fix Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                    │
│              nightly-vercel-build-fix.yml                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Step 1: Check Vercel Build       │
        │  (No agent - API call)            │
        └───────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
              ✅ Healthy        ❌ Error
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Step 2: Get Build Logs  │
                    │   │  (No agent - API call)   │
                    │   └──────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Step 3: Create Branch  │
                    │   │  fix/vercel-build-...   │
                    │   └──────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Agent 1: Fix Errors     │
                    │   │  cursor-agent -p "..."   │
                    │   │  • Fixes TypeScript      │
                    │   │  • Fixes ESLint          │
                    │   │  • Fixes imports         │
                    │   └──────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Commit & Push Changes   │
                    │   └──────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Create PR               │
                    │   └──────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Agent 2: Review PR      │
                    │   │  cursor-agent -p "..."   │
                    │   │  • Analyzes diff         │
                    │   │  • Checks safety         │
                    │   │  • Outputs: SAFE/UNSAFE │
                    │   └──────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Agent 3: Post Review    │
                    │   │  (GitHub API)             │
                    │   │  • Comments on PR         │
                    │   │  • Optional: Approve      │
                    │   └──────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Agent 4: Fix Feedback   │
                    │   │  (If NEEDS_REVIEW)       │
                    │   │  • Reads review           │
                    │   │  • Makes fixes            │
                    │   │  • Pushes updates         │
                    │   └──────────────────────────┘
                    │               │
                    └───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Human Review │
                    │  (Morning)    │
                    └───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Merge PR     │
                    └───────────────┘
```

## Enhanced Multi-Agent Pattern

```
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Multi-Agent Workflow                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Agent 1: Diagnose                │
        │  • Analyzes build logs             │
        │  • Categorizes errors              │
        │  • Determines fix strategy         │
        │  Output: diagnosis.txt             │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Agent 2: Fix                     │
        │  • Reads diagnosis.txt             │
        │  • Fixes auto-fixable issues       │
        │  • Commits to branch               │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Agent 3: Review                  │
        │  • Reviews git diff                │
        │  • Checks safety                   │
        │  • Outputs: review.txt              │
        └───────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
            SAFE_TO_MERGE    NEEDS_REVIEW
                    │               │
                    │               ▼
                    │   ┌──────────────────────────┐
                    │   │  Agent 4: Fix Feedback   │
                    │   │  • Reads review.txt       │
                    │   │  • Addresses concerns     │
                    │   │  • Pushes updates         │
                    │   └──────────────────────────┘
                    │               │
                    └───────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Agent 5: Post to PR               │
        │  • Comments review on PR             │
        │  • Optional: Auto-approve          │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Agent 6: Create Linear Task       │
        │  (For complex issues)              │
        │  • Reads diagnosis.txt             │
        │  • Creates task if needed          │
        └───────────────────────────────────┘
```

## Communication Flow

```
Agent 1 (Diagnose)
    │
    │ writes: diagnosis.txt
    ▼
Agent 2 (Fix)
    │
    │ commits: git changes
    ▼
Agent 3 (Review)
    │
    │ reads: git diff
    │ writes: review.txt
    ▼
Agent 4 (Post Review)
    │
    │ reads: review.txt
    │ writes: PR comment (GitHub API)
    ▼
Agent 5 (Fix Feedback) [optional]
    │
    │ reads: PR comments (GitHub API)
    │ commits: additional fixes
    ▼
Human Review
```

## Data Flow Example

```yaml
# Agent 1 Output
diagnosis.txt:
  ERROR_TYPE: TypeScript
  SEVERITY: HIGH
  AUTO_FIXABLE: YES
  FIX_STRATEGY: Fix type errors in src/components

# Agent 2 Input
Reads: diagnosis.txt
Fixes: TypeScript errors
Commits: Changes to branch

# Agent 3 Input
Reads: git diff main...HEAD
Outputs: review.txt
  Status: SAFE_TO_MERGE
  Concerns: None
  Recommendation: Approve

# Agent 4 Input
Reads: review.txt
Posts: PR comment with review

# Agent 5 Input (if needed)
Reads: PR comments
Fixes: Additional issues
Commits: More changes
```

## Parallel Agent Pattern

```
                    ┌─────────────┐
                    │  Main Agent  │
                    │  (Orchestrator)│
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Agent A      │  │ Agent B     │  │ Agent C      │
│ Security     │  │ Performance   │  │ Code Quality │
│ Review       │  │ Review        │  │ Review       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       │ writes:         │ writes:          │ writes:
       │ security.txt    │ perf.txt         │ quality.txt
       └─────────────────┼──────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ Consolidate Agent │
              │ Reads all reviews │
              │ Creates summary   │
              └──────────────────┘
```

