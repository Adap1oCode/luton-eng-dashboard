# How to Reproduce Production Error in Dev

## The Issue
Production was returning HTML error pages instead of JSON when `/api/me/role` crashed.

## Why It Doesn't Happen in Dev

1. **Error Handling**: Dev mode shows error overlays, production returns HTML
2. **Code Bundling**: Production optimizes/bundles code differently
3. **Module Loading**: Production build process may import modules in different order
4. **Environment**: Dev has env vars, production might have different config

## How to Test the Fix

### Option 1: Simulate Missing Env Vars

Temporarily comment out env vars in `.env.local`:
```bash
# NEXT_PUBLIC_SUPABASE_URL=your-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

Then restart dev server and try accessing `/forms/tally-cards`.

### Option 2: Build Production Locally

```bash
npm run build
npm start
```

Then test the production build locally.

### Option 3: Check Vercel Logs

The error should show in Vercel function logs if it's still happening.

## What We Fixed

1. **Logger initialization**: Added try-catch with fallback
2. **Browser client**: Only throws in browser context, not server
3. **API route**: Wrapped entire route in try-catch to always return JSON
4. **Session context**: Added content-type checking before JSON parsing

## Verification

After deploying, check:
- Vercel build succeeds
- `/api/me/role` always returns JSON (even on errors)
- `/forms/tally-cards` loads without JSON parse errors
