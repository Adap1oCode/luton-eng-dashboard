# Test Failures Handoff Document

**Branch:** `fix/test-failures-M1`  
**Date:** October 25, 2025  
**Status:** 42 test failures remaining (539 passing)  
**Pass Rate:** 92.8% (539/581)

---

## ✅ What Has Been Fixed (52 test failures resolved)

### **1. Build Verification Tests (52 failures → 0 failures)**
- **Files Fixed:**
  - `src/tests/integration/build-verification.spec.ts`
  - `src/tests/integration/simple-build-verification.spec.ts`

- **Problem:** Tests were checking for build artifacts that Next.js 15 App Router doesn't create (components, hooks, lib in `.next/server/`)
- **Solution:** Updated tests to check actual Next.js 15 build output structure
- **Commit:** `fix(tests): update build verification tests for Next.js 15 App Router`

---

## ❌ Remaining Test Failures (42 tests)

### **Category 1: API Pagination/Clamping Logic (2 failures)**

**Affected Files:**
- `src/lib/api/handle-list.spec.ts` (1 failure)
- `src/lib/http/list-params.spec.ts` (1 failure)

**Error:**
```
Expected: 500
Received: 2000
```

**Root Cause:**  
Tests expect `pageSize` to be clamped to max 500, but actual implementation allows 2000.

**Fix Strategy:**
1. **Check the API pagination logic** in `src/lib/api/handle-list.ts` and `src/lib/http/list-params.ts`
2. **Decision needed:** Should max pageSize be 500 or 2000?
   - If 500: Update implementation to enforce this limit
   - If 2000: Update tests to expect 2000

**Estimated Effort:** 15 minutes  
**Risk Level:** Low (business logic clarification needed)

---

### **Category 2: Auth Form Label Issues (4 failures)**

**Affected Files:**
- `src/app/auth/__tests__/auth-routing.spec.tsx` (4 failures)

**Error:**
```
Found a label with the text of: Email, however no form control 
was found associated to that label. Make sure you're using the 
"for" attribute or "aria-labelledby" attribute correctly.
```

**Root Cause:**  
The form labels have mismatched `htmlFor` attributes, causing accessibility issues in tests.

**Fix Strategy:**
1. **Inspect form components** in:
   - `src/app/auth/login/page.tsx`
   - `src/app/auth/register/page.tsx`
2. **Ensure label `htmlFor` matches input `id`**
3. **Update form field generation** to create unique IDs (currently using `_r_3_-form-item` etc.)

**Estimated Effort:** 30 minutes  
**Risk Level:** Medium (affects accessibility)

**Example Fix:**
```tsx
// Before
<label htmlFor="email-input">Email</label>
<input id="some-other-id" />

// After
<label htmlFor="email-input">Email</label>
<input id="email-input" />
```

---

### **Category 3: Auth Loading State Icon Test (1 failure)**

**Affected Files:**
- `src/app/auth/__tests__/auth-improvements.spec.tsx` (1 failure)

**Error:**
```
Unable to find an element with the role "img"
```

**Root Cause:**  
The loading spinner is an SVG without proper accessibility attributes.

**Fix Strategy:**
1. **Add `role="img"` and `aria-label`** to the loading SVG in the auth loading component
2. **Update test** to use `screen.getByTestId('loading-spinner')` instead of role

**Estimated Effort:** 10 minutes  
**Risk Level:** Low

---

### **Category 4: Missing Password Strength Component (2 failures)**

**Affected Files:**
- `src/app/auth/__tests__/auth-improvements.spec.tsx` (2 failures)

**Error:**
```
Cannot find module '@/components/auth/password-strength'
```

**Root Cause:**  
The component doesn't exist, but tests reference it.

**Fix Strategy:**
1. **Decision needed:** Was this component planned but not implemented?
   - **Option A:** Create the component (estimated 1 hour)
   - **Option B:** Remove the tests (estimated 5 minutes)
2. **If creating component:**
   - Create `src/components/auth/password-strength.tsx`
   - Implement password strength indicators (weak/medium/strong)
   - Export from component

**Estimated Effort:** 5 minutes (remove tests) OR 1 hour (implement component)  
**Risk Level:** Low (feature decision)

---

### **Category 5: Auth Action Header Mocking (6 failures)**

**Affected Files:**
- `src/app/(main)/auth/v1/actions.spec.ts` (6 failures)

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'get')
```

**Root Cause:**  
The `headers()` function from `next/headers` returns `undefined` in tests.

**Fix Strategy:**
1. **Mock `next/headers` in the test file:**
```typescript
import { vi } from 'vitest';
import { headers } from 'next/headers';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'host') return 'localhost:3000';
      if (key === 'x-forwarded-proto') return 'http';
      return null;
    })
  }))
}));
```

2. **Reset mock between tests:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

**Estimated Effort:** 30 minutes  
**Risk Level:** Low

---

### **Category 6: Auth Integration Tests - Missing React Import (8 failures)**

**Affected Files:**
- `src/app/(main)/auth/v1/integration.spec.tsx` (8 failures)

**Error:**
```
ReferenceError: React is not defined
```

**Root Cause:**  
The test file is missing `import React from 'react'` at the top.

**Fix Strategy:**
1. **Add import to test file:**
```typescript
import React from 'react';
```

**Estimated Effort:** 2 minutes  
**Risk Level:** Very Low

---

### **Category 7: Database Schema Field Mismatch (2 failures)**

**Affected Files:**
- `src/lib/data/resources/all-resources.config.spec.ts` (2 failures for `tcm_tally_cards` and `tally-cards`)

**Error:**
```
expected [ 'id', 'card_uid', …(9) ] to include 'status'
```

**Root Cause:**  
The resource config schema defines a `status` field, but it's not included in the `select` string.

**Fix Strategy:**
1. **Find the resource config** in `src/lib/data/resources/`
2. **Add `status` to the select string:**
```typescript
// Before
select: "id,card_uid,card_number,..."

// After
select: "id,card_uid,card_number,...,status"
```

**Estimated Effort:** 10 minutes  
**Risk Level:** Low

---

### **Category 8: Resource Naming Convention (1 failure)**

**Affected Files:**
- `src/lib/data/resources/all-resources.config.spec.ts` (1 failure)

**Error:**
```
expected 'inventorySummary' to match /^[a-z][a-z0-9_]*$/
```

**Root Cause:**  
Test expects snake_case (`inventory_summary`) but resource uses camelCase (`inventorySummary`).

**Fix Strategy:**
1. **Decision needed:** Which convention should be enforced?
   - **Option A:** Rename resource to `inventory_summary` (preferred for consistency)
   - **Option B:** Update test regex to allow camelCase

2. **If renaming:**
   - Find all references to `inventorySummary`
   - Replace with `inventory_summary`
   - Update API routes and database queries

**Estimated Effort:** 20 minutes  
**Risk Level:** Medium (affects API contract)

---

### **Category 9: Resource Feature Config Mismatch (1 failure)**

**Affected Files:**
- `src/tests/unit/generators/resource-page-generator.spec.tsx` (1 failure)

**Error:**
```
Expected: { rowSelection: false, pagination: true, sorting: false, filtering: true, inlineEditing: true }
Received: { rowSelection: false, pagination: true, sortable: false }
```

**Root Cause:**  
The generator creates `sortable` instead of `sorting`, and doesn't create `filtering`/`inlineEditing` properties.

**Fix Strategy:**
1. **Update test expectations** to match actual generator output:
```typescript
expect(viewConfig.features).toEqual({
  rowSelection: false,
  pagination: true,
  sortable: false,
});
```

2. **OR update generator** to produce all expected fields (if they're required)

**Estimated Effort:** 10 minutes  
**Risk Level:** Low

---

### **Category 10: API Route 404s (4 failures)**

**Affected Files:**
- `src/app/api/[resource]/[id]/route.tally_cards.spec.ts` (4 failures)

**Error:**
```
Expected: 200
Received: 404
```

**Root Cause:**  
The API route handler is returning 404 instead of processing the request. Likely a routing or resource registration issue.

**Fix Strategy:**
1. **Verify resource is registered** in `src/lib/data/resources/all-resources.ts`
2. **Check route handler** in `src/app/api/[resource]/[id]/route.ts`
3. **Debug test setup:**
   - Ensure mock requests have correct params structure
   - Verify `ctx.params.resource` is being set correctly

**Estimated Effort:** 45 minutes  
**Risk Level:** Medium

---

### **Category 11: Auth Callback Route Mock Issues (4 failures)**

**Affected Files:**
- `src/app/(main)/auth/v1/callback/route.spec.ts` (4 failures)

**Error:**
```
TypeError: vi.mocked(...).mockImplementation is not a function
```

**Root Cause:**  
Incorrect use of `vi.mocked()` - it's being called on a `require()` result.

**Fix Strategy:**
1. **Fix mock setup:**
```typescript
// Before
vi.mocked(require('@supabase/auth-helpers-nextjs').createRouteHandlerClient).mockImplementation(...)

// After
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
vi.mocked(createRouteHandlerClient).mockImplementation(...)
```

2. **Add mock at top of file:**
```typescript
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn()
}));
```

**Estimated Effort:** 20 minutes  
**Risk Level:** Low

---

### **Category 12: Clipboard Cleanup Error (1 failure in suite setup)**

**Affected Files:**
- `src/app/(main)/auth/v1/integration.spec.tsx` (suite level error)

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'clipboard')
```

**Root Cause:**  
`@testing-library/user-event` is trying to access `document.clipboard` which isn't defined in the test environment.

**Fix Strategy:**
1. **Add jsdom clipboard mock in vitest setup:**
```typescript
// vitest.setup.ts
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
});
```

**Estimated Effort:** 10 minutes  
**Risk Level:** Low

---

## 📊 Summary by Priority

### **🔴 High Priority (Must Fix Before Merge)**
1. **Auth Form Labels (4 tests)** - Accessibility issue  
   **Effort:** 30 min | **Impact:** High

2. **API Route 404s (4 tests)** - Core functionality broken  
   **Effort:** 45 min | **Impact:** High

3. **Auth Action Mocking (6 tests)** - Critical auth flow  
   **Effort:** 30 min | **Impact:** High

**Total High Priority:** 14 tests, ~1h 45min

---

### **🟡 Medium Priority (Should Fix Soon)**
1. **Resource Naming Convention (1 test)** - API consistency  
   **Effort:** 20 min | **Impact:** Medium

2. **Database Schema Fields (2 tests)** - Data integrity  
   **Effort:** 10 min | **Impact:** Medium

3. **Pagination Clamping (2 tests)** - Business logic clarification  
   **Effort:** 15 min | **Impact:** Low-Medium

**Total Medium Priority:** 5 tests, ~45min

---

### **🟢 Low Priority (Can Be Deferred)**
1. **Auth Integration React Import (8 tests)** - Trivial fix  
   **Effort:** 2 min | **Impact:** Low

2. **Password Strength Component (2 tests)** - Feature decision  
   **Effort:** 5 min (delete) OR 1h (implement) | **Impact:** Low

3. **Loading State Icon (1 test)** - UI polish  
   **Effort:** 10 min | **Impact:** Low

4. **Auth Callback Mocks (4 tests)** - Test infrastructure  
   **Effort:** 20 min | **Impact:** Low

5. **Resource Feature Config (1 test)** - Test alignment  
   **Effort:** 10 min | **Impact:** Low

6. **Clipboard Error (1 test)** - Test environment  
   **Effort:** 10 min | **Impact:** Low

**Total Low Priority:** 17 tests, ~57min (or 1h 52min if implementing component)

---

## 🎯 Recommended Action Plan

### **Phase 1: Quick Wins (20 minutes)**
1. Add React import to `integration.spec.tsx` (8 tests fixed)
2. Fix resource feature config expectations (1 test fixed)
3. Add clipboard mock to `vitest.setup.ts` (1 test fixed)

**Result:** 10 tests fixed, 32 remaining

---

### **Phase 2: Auth Fixes (1.5 hours)**
1. Fix auth form label accessibility (4 tests)
2. Fix auth action header mocking (6 tests)
3. Fix auth callback route mocks (4 tests)
4. Fix loading state icon (1 test)
5. Remove/implement password strength tests (2 tests)

**Result:** 17 tests fixed, 15 remaining

---

### **Phase 3: API & Schema (1 hour)**
1. Fix API route 404s (4 tests)
2. Fix database schema select fields (2 tests)
3. Fix/clarify pagination clamping logic (2 tests)
4. Fix/clarify resource naming convention (1 test)

**Result:** 9 tests fixed, 6 remaining

---

### **Phase 4: Verification & PR**
1. Run full `npm run ci:verify`
2. Ensure all tests pass
3. Push and create PR
4. Monitor CI/Vercel

**Total Estimated Time:** ~3-4 hours

---

## 📁 Files Requiring Changes

### **Test Files to Modify:**
- `src/app/auth/__tests__/auth-routing.spec.tsx`
- `src/app/auth/__tests__/auth-improvements.spec.tsx`
- `src/app/(main)/auth/v1/actions.spec.ts`
- `src/app/(main)/auth/v1/integration.spec.tsx`
- `src/app/(main)/auth/v1/callback/route.spec.ts`
- `src/app/api/[resource]/[id]/route.tally_cards.spec.ts`
- `src/lib/api/handle-list.spec.ts`
- `src/lib/http/list-params.spec.ts`
- `src/lib/data/resources/all-resources.config.spec.ts`
- `src/tests/unit/generators/resource-page-generator.spec.tsx`

### **Source Files to Modify:**
- `src/app/auth/login/page.tsx` (fix labels)
- `src/app/auth/register/page.tsx` (fix labels)
- `src/lib/data/resources/all-resources.ts` (verify tally_cards registration)
- `src/lib/data/resources/*.config.ts` (add status to select, rename inventorySummary)
- `src/lib/api/handle-list.ts` (verify/fix pageSize clamping)
- `src/lib/http/list-params.ts` (verify/fix pageSize clamping)
- `vitest.setup.ts` (add clipboard mock)

### **Potentially New Files:**
- `src/components/auth/password-strength.tsx` (if implementing feature)

---

## 🔍 How to Continue

### **For Another Developer:**
```bash
# 1. Pull the branch
git checkout fix/test-failures-M1
git pull origin fix/test-failures-M1

# 2. Install dependencies (if needed)
npm install

# 3. Run tests to see current state
npm run test

# 4. Start with Phase 1 quick wins:
#    - Add 'import React from "react"' to integration.spec.tsx
#    - Update feature config test expectations
#    - Add clipboard mock to vitest.setup.ts

# 5. Run tests again to verify fixes
npm run test

# 6. Move to Phase 2 (auth fixes) and Phase 3 (API/schema)

# 7. Final verification
npm run ci:verify

# 8. Push and create PR
git push
gh pr create --title "fix(tests): resolve remaining 42 test failures"
```

### **For Cursor Agent:**
```
1. Read this handoff document
2. Start with Category 6 (easiest - just add React import)
3. Work through categories by priority (High → Medium → Low)
4. After each category, commit progress:
   git commit -m "fix(tests): [category name]"
5. Run tests frequently to verify fixes
6. Once all passing, run full ci:verify
7. Create PR with summary of all fixes
```

---

## 📝 Additional Context

### **Test Suite Structure:**
- **Total Tests:** 581
- **Passing:** 539 (92.8%)
- **Failing:** 42 (7.2%)
- **Test Duration:** ~16.6 seconds

### **Key Testing Tools:**
- **Unit Tests:** Vitest
- **React Testing:** `@testing-library/react`, `@testing-library/user-event`
- **Mocking:** `vitest` `vi` utilities
- **Coverage:** Not currently configured

### **Working Agreement Compliance:**
- ✅ CI infrastructure is working
- ✅ Pre-push hooks are active
- ✅ Build verification passes
- ❌ Full test suite needs to pass before final PR merge

---

## 🎉 What's Working Well

1. **Build Infrastructure:** All build verification tests now pass
2. **CI Pipeline:** `ci:verify` script works correctly
3. **Most Tests:** 92.8% of tests are passing
4. **Type Safety:** TypeScript compilation succeeds
5. **Linting:** ESLint passes (with non-blocking warnings)

---

## ⚠️ Known Issues Beyond Tests

1. **Lint Warnings:** 15 warnings (non-blocking, mostly exhaustive-deps)
2. **Potential Domain Issues:** Some tests may reveal actual bugs in:
   - API routing (404s)
   - Database schema mismatches
   - Form accessibility

---

**End of Handoff Document**  
**Good luck! 🚀**

