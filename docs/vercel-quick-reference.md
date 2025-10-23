# Vercel Deployment Quick Reference

## 🚀 Essential Commands

### Deploy & Monitor
```bash
# 1. Commit and push
git add .
git commit --no-verify -m "fix: <description>"
git push origin <branch>

# 2. Monitor deployment
node monitor-vercel.cjs
```

### Check Status
```bash
# List all deployments
npx vercel ls --yes

# Check specific deployment
npx vercel inspect <deployment-url>

# Get logs
npx vercel logs <deployment-url>
```

### Local Testing
```bash
# Test build locally
npm run build

# Check types
npm run typecheck

# Fix linting
npm run lint:fix
```

## 🔧 Common Fixes

### TypeScript Errors
```bash
# Check for syntax errors
npm run typecheck

# Common fixes:
# - Add missing closing parentheses
# - Fix import statements
# - Resolve type mismatches
```

### ESLint Errors
```bash
# Auto-fix what's possible
npm run lint:fix

# Manual fixes for remaining issues
npm run lint
```

### Build Failures
```bash
# Clean and rebuild
rm -rf .next
npm run build

# Check configuration
cat next.config.mjs
cat tsconfig.json
```

## 📊 Error Patterns

| Error | Quick Fix |
|-------|-----------|
| `useSearchParams.*suspense` | Wrap in `<Suspense>` |
| `syntax error` | Check parentheses/brackets |
| `module not found` | Check imports |
| `typescript error` | Run `npm run typecheck` |
| `eslint error` | Run `npm run lint:fix` |

## 🎯 Success Checklist

- [ ] Local build passes: `npm run build`
- [ ] TypeScript clean: `npm run typecheck`
- [ ] ESLint clean: `npm run lint`
- [ ] Deployment status: "Ready"
- [ ] No error logs in Vercel

## 🚨 Emergency Fixes

### Bypass Pre-commit Hooks
```bash
git commit --no-verify -m "emergency fix"
```

### Force Clean Build
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Check Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Check latest deployment
4. Review build logs

---

*Quick reference for Vercel deployment monitoring and error fixing*
