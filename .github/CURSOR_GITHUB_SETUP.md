# GitHub CLI Setup for Cursor Agents

## Problem
The current GitHub token (`ghs_*`) is from a GitHub App integration with limited scopes. It cannot create Pull Requests.

## Long-Term Solution

### Option 1: Personal Access Token (Recommended)

1. **Create a PAT:**
   - Go to: https://github.com/settings/tokens/new
   - Name: "Cursor Agent - Luton Dashboard"
   - Expiration: 90 days (or No expiration for CI/CD)
   - Scopes needed:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
   - Click "Generate token"

2. **Configure gh CLI:**
   ```bash
   # Store the token
   echo "YOUR_TOKEN_HERE" | gh auth login --with-token
   
   # Verify it works
   gh auth status
   
   # Test PR creation
   gh pr create --title "Test" --body "Test PR" --base main
   ```

3. **For Cursor Environment:**
   ```bash
   # Add to your shell profile (~/.bashrc or ~/.zshrc)
   export GITHUB_TOKEN="ghp_your_token_here"
   
   # Or configure gh directly
   gh auth login --with-token < token.txt
   ```

### Option 2: GitHub App with Correct Permissions

If you must use a GitHub App:

1. Go to: https://github.com/settings/apps
2. Find the "Cursor" app
3. Update permissions:
   - **Pull requests:** Read & Write
   - **Contents:** Read & Write
   - **Metadata:** Read-only (required)
4. Install/update the app on your repository
5. Regenerate the token

## Current Workaround

Until permissions are fixed, PRs must be created manually:

**PR Creation Link:**
```
https://github.com/Adap1oCode/luton-eng-dashboard/pull/new/feat/saved-views-final
```

## Verification

After setting up, test with:
```bash
gh auth status
# Should show: ✓ Token scopes: repo, workflow

gh pr list
# Should list PRs (not error)

gh pr create --title "Test" --body "Test" --base main --draft
# Should create a draft PR
```

## Security Notes

- Store PATs securely (use environment variables, not files)
- Rotate tokens every 90 days
- Use minimal required scopes
- Never commit tokens to git
- Consider using GitHub CLI's built-in token storage

## For CI/CD

Add as GitHub Actions secret:
```yaml
name: Create PR
on: push
jobs:
  pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create PR
        env:
          GH_TOKEN: ${{ secrets.CURSOR_PAT }}
        run: gh pr create --title "..." --body "..."
```
