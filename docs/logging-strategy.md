# Logging Strategy

## Current Situation

The codebase currently has **30+ console.log/console.error statements** in production code, primarily in:
- `stock-adjustment-form-wrapper.tsx`
- `stock-adjustment-form-with-locations.tsx`
- `auth/actions.ts`
- `edit/page.tsx`

## Problem with Console Logs

1. **Performance**: Console operations are synchronous and can block the event loop
2. **Information Leakage**: Console logs may expose sensitive data in production
3. **No Centralized View**: Console logs are scattered across server logs, browser console, and Vercel logs
4. **No Structured Data**: Console logs are plain text, hard to search/filter
5. **No Log Levels**: Can't control verbosity (debug vs info vs error)

## Solution: Use Structured Logging Service

The codebase already has a **proper logging service** at `@/lib/obs/logger.ts` that:
- Uses Pino (high-performance structured logger)
- Supports multiple transports (Logtail, Grafana Loki)
- Provides structured JSON logs
- Has proper log levels (debug, info, warn, error)
- Automatically includes service metadata

## Migration Strategy

### Phase 1: Replace Console Logs with Logger (Recommended)

**For Server-Side Code (Server Actions, API Routes, Server Components):**

```typescript
// ❌ OLD WAY
console.log("[StockAdjustmentFormWrapper] First SCD2 call - payload:", payload);
console.error("[StockAdjustmentFormWrapper] Fetch failed:", error);

// ✅ NEW WAY
import { logger } from "@/lib/obs/logger";

logger.info({ 
  component: "StockAdjustmentFormWrapper",
  action: "scd2_call",
  payload: payload // Logger automatically serializes
}, "First SCD2 call");

logger.error({ 
  component: "StockAdjustmentFormWrapper",
  action: "fetch_failed",
  error: error 
}, "Fetch failed");
```

**For Client-Side Code (React Components):**

Client-side code runs in the browser, so we have two options:

**Option A: Use Logger with Client-Side Transport (Recommended)**
- Create a client-side logger that sends to your logging service
- Or use the existing logger if it works client-side

**Option B: Conditional Console Logs (Quick Fix)**
- Guard console logs with environment checks
- Only log in development

```typescript
// ✅ SAFE FOR CLIENT-SIDE
if (process.env.NODE_ENV === 'development') {
  console.log("[Component] Debug info:", data);
}
```

### Phase 2: Remove Debug Logs or Convert to Debug Level

For logs that are only needed during development:

```typescript
// ✅ Use debug level (only logs in development)
logger.debug({ 
  component: "StockAdjustmentFormWrapper",
  step: "location_movement"
}, "Moving locations to new entry_id");
```

### Phase 3: Add Context to Logs

Always include context in logs for easier troubleshooting:

```typescript
// ✅ GOOD: Includes context
logger.info({
  component: "StockAdjustmentFormWrapper",
  entryId: currentEntryId,
  newEntryId: newEntryId,
  locationsCount: locationsToUse.length,
  isMultiLocation: isMultiLocation
}, "SCD2 submission completed");

// ❌ BAD: No context
logger.info("SCD2 submission completed");
```

## Immediate Action Plan

### Quick Win: Guard Console Logs (Can Do Now)

If you want to keep console logs for now but make them safe:

1. **For Server-Side Code**: Replace with logger
2. **For Client-Side Code**: Add environment guards

```typescript
// Helper function for client-side
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

// Usage
devLog("[Component] Debug info:", data);
```

### Long-Term: Full Migration to Logger

1. Replace all `console.log` → `logger.info` or `logger.debug`
2. Replace all `console.error` → `logger.error`
3. Replace all `console.warn` → `logger.warn`
4. Remove environment guards (logger handles this)
5. Add structured context to all logs

## Benefits

✅ **Centralized Logging**: All logs in one place (Logtail/Loki)  
✅ **Structured Data**: Easy to search/filter by component, action, etc.  
✅ **Performance**: Async logging doesn't block  
✅ **Security**: Sensitive data can be redacted  
✅ **Production Ready**: Log levels control verbosity  
✅ **Better Debugging**: Structured logs are easier to analyze  

## Example: Before/After

**Before:**
```typescript
console.log("[StockAdjustmentFormWrapper] First SCD2 call - endpoint:", endpoint);
console.log("[StockAdjustmentFormWrapper] First SCD2 call - payload:", JSON.stringify(firstCallPayload, null, 2));
```

**After:**
```typescript
logger.info({
  component: "StockAdjustmentFormWrapper",
  phase: "scd2_metadata",
  endpoint,
  payload: firstCallPayload,
  entryId,
  isMultiLocation
}, "First SCD2 call - updating metadata");
```

## Recommendation

**For this PR:** 
- Keep console logs for now (they're working)
- Add a TODO comment to migrate to logger
- Or do a quick guard with `if (process.env.NODE_ENV === 'development')`

**For Future:**
- Migrate to logger service gradually
- Start with high-traffic areas (form submissions, API routes)
- Keep console logs only for client-side development debugging





