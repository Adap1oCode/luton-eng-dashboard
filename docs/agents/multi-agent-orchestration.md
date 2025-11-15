# Multi-Agent Orchestration in GitHub Actions

This guide explains how to chain multiple AI agents together in GitHub Actions workflows to create sophisticated automation pipelines.

## How Agents Work in GitHub Actions

**Agents are just CLI commands** - each agent is a separate `cursor-agent` invocation that:
1. Receives input (files, prompts, context)
2. Performs work (fixes, reviews, generates code)
3. Produces output (file changes, comments, status)
4. Passes results to the next agent (via files, PR comments, or GitHub API)

## Communication Patterns

Agents communicate through:

### 1. **File System** (Most Common)
```yaml
- name: Agent 1 - Fix Issues
  run: |
    cursor-agent -p "Fix TypeScript errors" > agent1-output.txt
    
- name: Agent 2 - Review Changes
  run: |
    cursor-agent -p "Review the fixes in agent1-output.txt"
```

### 2. **Git Branch State**
```yaml
- name: Agent 1 - Create Fixes
  run: cursor-agent -p "Fix errors"  # Commits to branch
  
- name: Agent 2 - Review Branch
  run: |
    git diff main...HEAD > changes.diff
    cursor-agent -p "Review changes.diff"
```

### 3. **PR Comments** (GitHub API)
```yaml
- name: Agent 1 - Review PR
  run: |
    REVIEW=$(cursor-agent -p "Review PR #123")
    # Post review as PR comment
    
- name: Agent 2 - Respond to Review
  run: |
    # Read PR comments
    cursor-agent -p "Address review feedback"
```

### 4. **GitHub Actions Outputs**
```yaml
- name: Agent 1
  id: agent1
  run: |
    RESULT=$(cursor-agent -p "Analyze code")
    echo "result=$RESULT" >> $GITHUB_OUTPUT
    
- name: Agent 2
  run: |
    cursor-agent -p "Based on: ${{ steps.agent1.outputs.result }}"
```

## Multi-Agent Workflow Patterns

### Pattern 1: Sequential Pipeline (Fix → Review → Deploy)

```yaml
jobs:
  multi-agent-pipeline:
    steps:
      # Agent 1: Fix Issues
      - name: Agent 1 - Fix Errors
        run: |
          cursor-agent -p "Fix all TypeScript errors in src/"
          git add -A
          git commit -m "fix: agent1 fixes"
          
      # Agent 2: Review Changes
      - name: Agent 2 - Review Fixes
        run: |
          DIFF=$(git diff main...HEAD)
          REVIEW=$(cursor-agent -p "Review these changes: $DIFF")
          echo "$REVIEW" > review.txt
          
      # Agent 3: Apply Review Feedback
      - name: Agent 3 - Address Review
        if: contains(steps.agent2.outputs.review, 'NEEDS_CHANGES')
        run: |
          cursor-agent -p "Address review feedback in review.txt"
          git add -A
          git commit -m "fix: address review feedback"
          
      # Agent 4: Deploy/Merge
      - name: Agent 4 - Deploy
        if: contains(steps.agent2.outputs.review, 'APPROVED')
        run: |
          # Auto-merge PR or trigger deployment
```

### Pattern 2: Parallel Agents (Multiple Specialists)

```yaml
jobs:
  parallel-review:
    steps:
      # Run multiple agents in parallel
      - name: Agent 1 - Security Review
        run: |
          cursor-agent -p "Review code for security issues" > security-review.txt &
          
      - name: Agent 2 - Performance Review
        run: |
          cursor-agent -p "Review code for performance issues" > perf-review.txt &
          
      - name: Agent 3 - Code Quality Review
        run: |
          cursor-agent -p "Review code quality and best practices" > quality-review.txt &
          
      # Consolidate results
      - name: Consolidate Reviews
        run: |
          cat security-review.txt perf-review.txt quality-review.txt > all-reviews.txt
          cursor-agent -p "Summarize all reviews in all-reviews.txt"
```

### Pattern 3: Iterative Loop (Fix → Test → Fix Again)

```yaml
jobs:
  iterative-fix:
    steps:
      - name: Setup
        run: |
          echo "iteration=1" >> $GITHUB_ENV
          echo "max_iterations=5" >> $GITHUB_ENV
          
      - name: Fix Loop
        run: |
          while [ $iteration -le $max_iterations ]; do
            echo "🔄 Iteration $iteration"
            
            # Agent fixes issues
            cursor-agent -p "Fix all errors" || true
            
            # Test if fixes work
            npm run test || TEST_FAILED=true
            
            if [ -z "$TEST_FAILED" ]; then
              echo "✅ All tests pass - breaking loop"
              break
            fi
            
            iteration=$((iteration + 1))
            echo "iteration=$iteration" >> $GITHUB_ENV
          done
```

### Pattern 4: PR-Based Workflow (Create → Review → Fix → Merge)

```yaml
jobs:
  pr-workflow:
    steps:
      # Agent 1: Create PR with fixes
      - name: Agent 1 - Create Fix PR
        run: |
          cursor-agent -p "Fix Vercel build errors"
          git checkout -b fix/auto-fix-$(date +%s)
          git commit -am "fix: auto-fixes"
          git push origin HEAD
          gh pr create --title "Auto-fix" --body "Auto-generated"
          
      # Wait for PR to be created
      - name: Wait for PR
        run: sleep 10
        id: wait
      
      # Agent 2: Review PR
      - name: Agent 2 - Review PR
        id: review
        run: |
          PR_NUMBER=$(gh pr list --head fix/auto-fix --json number -q '.[0].number')
          PR_DIFF=$(gh pr diff $PR_NUMBER)
          
          REVIEW=$(cursor-agent -p "Review PR #$PR_NUMBER changes: $PR_DIFF")
          echo "review_status=$REVIEW" >> $GITHUB_OUTPUT
          
          # Post review as PR comment
          gh pr comment $PR_NUMBER --body "$REVIEW"
      
      # Agent 3: Fix based on review
      - name: Agent 3 - Address Review
        if: contains(steps.review.outputs.review_status, 'NEEDS_CHANGES')
        run: |
          PR_NUMBER=$(gh pr list --head fix/auto-fix --json number -q '.[0].number')
          COMMENTS=$(gh pr view $PR_NUMBER --comments --json comments -q '.[].body')
          
          cursor-agent -p "Address review comments: $COMMENTS"
          git commit -am "fix: address review"
          git push
      # Agent 4: Auto-merge if approved
      - name: Agent 4 - Auto-Merge
        if: contains(steps.review.outputs.review_status, 'APPROVED')
        run: |
          PR_NUMBER=$(gh pr list --head fix/auto-fix --json number -q '.[0].number')
          gh pr merge $PR_NUMBER --squash --auto
```

## Enhanced Vercel Build Fix Workflow

Here's how we can enhance the current workflow with multiple specialized agents:

```yaml
jobs:
  multi-agent-vercel-fix:
    steps:
      # Step 1: Check build status (no agent needed)
      - name: Check Vercel Build
        # ... existing check logic ...
      
      # Step 2: Agent 1 - Diagnose Issues
      - name: Agent 1 - Diagnose Build Errors
        if: steps.vercel_check.outputs.needs_fix == 'true'
        run: |
          LOGS=$(cat vercel-build-logs.txt)
          DIAGNOSIS=$(cursor-agent -p "Analyze these build logs and categorize errors:
          
          $LOGS
          
          Output format:
          - ERROR_TYPE: [TypeScript|ESLint|Config|Dependency|Runtime|Infrastructure]
          - SEVERITY: [CRITICAL|HIGH|MEDIUM|LOW]
          - AUTO_FIXABLE: [YES|NO]
          - FIX_STRATEGY: [brief description]")
          
          echo "$DIAGNOSIS" > diagnosis.txt
          echo "diagnosis=$DIAGNOSIS" >> $GITHUB_OUTPUT
      
      # Step 3: Agent 2 - Fix Safe Issues
      - name: Agent 2 - Fix Auto-Fixable Issues
        if: contains(steps.diagnosis.outputs.diagnosis, 'AUTO_FIXABLE: YES')
        run: |
          DIAGNOSIS=$(cat diagnosis.txt)
          cursor-agent -p "Fix the auto-fixable issues identified in diagnosis.txt:
          
          $DIAGNOSIS
          
          Only fix issues marked AUTO_FIXABLE: YES"
      
      # Step 4: Agent 3 - Review Fixes
      - name: Agent 3 - Review Fixes
        if: steps.changes.outputs.has_changes == 'true'
        run: |
          DIFF=$(git diff main...HEAD)
          REVIEW=$(cursor-agent -p "Review these fixes for safety:
          
          $DIFF
          
          Check:
          1. No logic changes
          2. No new features
          3. Only mechanical fixes
          
          Output: SAFE_TO_MERGE | NEEDS_REVIEW | UNSAFE")
          
          echo "$REVIEW" > review.txt
          echo "review=$REVIEW" >> $GITHUB_OUTPUT
      
      # Step 5: Create PR
      - name: Create PR
        # ... existing PR creation ...
      
      # Step 6: Agent 4 - Post Review to PR
      - name: Agent 4 - Post AI Review to PR
        if: steps.pr.outputs.result != ''
        run: |
          PR_NUMBER="${{ steps.pr.outputs.result }}"
          REVIEW=$(cat review.txt)
          
          gh pr comment $PR_NUMBER --body "## 🤖 AI Review
          
          $REVIEW
          
          **Recommendation:** ${{ steps.review.outputs.review }}"
      
      # Step 7: Agent 5 - Create Linear Task for Complex Issues
      - name: Agent 5 - Create Linear Task
        if: contains(steps.diagnosis.outputs.diagnosis, 'AUTO_FIXABLE: NO')
        run: |
          DIAGNOSIS=$(cat diagnosis.txt)
          # Use Linear API to create task
          # (requires LINEAR_API_KEY secret)
```

## Best Practices

### 1. **Clear Agent Responsibilities**
Each agent should have a single, clear purpose:
- Agent 1: Diagnose
- Agent 2: Fix
- Agent 3: Review
- Agent 4: Deploy

### 2. **Pass Context Between Agents**
```yaml
- name: Agent 1
  run: |
    RESULT=$(cursor-agent -p "Analyze")
    echo "$RESULT" > agent1-output.txt
    
- name: Agent 2
  run: |
    PREVIOUS=$(cat agent1-output.txt)
    cursor-agent -p "Based on: $PREVIOUS"
```

### 3. **Use Conditional Steps**
Only run agents when needed:
```yaml
- name: Agent 2
  if: steps.agent1.outputs.needs_fix == 'true'
  run: cursor-agent -p "..."
```

### 4. **Handle Failures Gracefully**
```yaml
- name: Agent Fix
  run: |
    cursor-agent -p "Fix errors" || echo "agent_failed=true" >> $GITHUB_ENV
  continue-on-error: true
  
- name: Fallback
  if: env.agent_failed == 'true'
  run: |
    # Manual fallback or create task
```

### 5. **Limit Agent Scope**
Give agents specific, bounded tasks:
```yaml
# ❌ Bad: Too broad
cursor-agent -p "Fix everything"

# ✅ Good: Specific scope
cursor-agent -p "Fix TypeScript errors in src/components only"
```

## Example: Complete Multi-Agent Workflow

See `.github/workflows/nightly-vercel-build-fix-enhanced.yml` for a full example with:
- Agent 1: Diagnose build errors
- Agent 2: Fix safe issues
- Agent 3: Review fixes
- Agent 4: Post review to PR
- Agent 5: Create Linear tasks for complex issues

## Communication Matrix

| Agent A → Agent B | Method | Example |
|-------------------|--------|---------|
| Fix → Review | Git diff | `git diff main...HEAD` |
| Review → Fix | PR comments | `gh pr comment` |
| Diagnose → Fix | File | `diagnosis.txt` |
| Fix → Deploy | GitHub API | `gh pr merge` |
| Review → Human | PR comment | `gh pr comment` |

## Limitations & Considerations

1. **Token Limits**: Each agent uses API tokens - be mindful of costs
2. **Time Limits**: GitHub Actions has timeout limits (6 hours max)
3. **Rate Limits**: Cursor API may have rate limits
4. **Error Handling**: Each agent can fail - plan fallbacks
5. **State Management**: Agents don't share memory - pass context explicitly

## Next Steps

1. Start simple: 2-3 agents in sequence
2. Add more agents as needed
3. Monitor costs and performance
4. Refine prompts based on results

