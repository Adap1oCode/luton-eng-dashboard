# Next Agent Prompt: Fix Remaining Test Failures

## 🎯 **Your Mission**
Fix the remaining 42 test failures in the `fix/test-failures-M1` branch to achieve 100% test pass rate and complete the Working Agreement compliance.

## 📋 **Context**
- **Repository:** `luton-eng-dashboard`
- **Current Branch:** `fix/test-failures-M1` 
- **Status:** 539/581 tests passing (92.8% pass rate)
- **Remaining:** 42 test failures across 12 categories
- **Previous Work:** CI guardrails are fully implemented and merged to main

## 🚀 **Quick Start**

```bash
# 1. Switch to the test fixes branch
git checkout fix/test-failures-M1
git pull origin fix/test-failures-M1

# 2. Install dependencies
npm install

# 3. Run tests to see current state
npm run test

# 4. Read the comprehensive handoff document
cat docs/cursor/test-failures-handoff.md
```

## 📖 **Essential Reading**
**MUST READ:** `docs/cursor/test-failures-handoff.md` - This contains:
- Detailed analysis of all 42 remaining failures
- Categorized by priority (High/Medium/Low)
- Specific fix strategies for each category
- Estimated effort times
- Code examples for fixes

## 🎯 **Recommended Approach**

### **Phase 1: Quick Wins (20 minutes)**
Start with the easiest fixes to build momentum:

1. **Add React import** to `src/app/(main)/auth/v1/integration.spec.tsx`
   ```typescript
   import React from 'react';
   ```
   **Result:** 8 tests fixed instantly

2. **Fix resource feature config test** in `src/tests/unit/generators/resource-page-generator.spec.tsx`
   - Update expectations to match actual generator output

3. **Add clipboard mock** to `vitest.setup.ts`
   ```typescript
   Object.assign(navigator, {
     clipboard: { writeText: vi.fn(), readText: vi.fn() }
   });
   ```

### **Phase 2: Auth Fixes (1.5 hours)**
Tackle the authentication-related failures:

1. **Fix form label accessibility** (4 tests)
   - Update `src/app/auth/login/page.tsx` and `src/app/auth/register/page.tsx`
   - Ensure `htmlFor` matches input `id`

2. **Fix auth action header mocking** (6 tests)
   - Mock `next/headers` in `src/app/(main)/auth/v1/actions.spec.ts`

3. **Fix auth callback route mocks** (4 tests)
   - Update mock setup in `src/app/(main)/auth/v1/callback/route.spec.ts`

4. **Fix loading state icon** (1 test)
   - Add `role="img"` to loading spinner

5. **Handle password strength component** (2 tests)
   - Either remove tests or implement the component

### **Phase 3: API & Schema (1 hour)**
Fix the core functionality issues:

1. **Fix API route 404s** (4 tests)
   - Debug `src/app/api/[resource]/[id]/route.tally_cards.spec.ts`
   - Check resource registration and route handler

2. **Fix database schema fields** (2 tests)
   - Add missing `status` field to select strings

3. **Fix pagination clamping** (2 tests)
   - Decide: max pageSize 500 or 2000?
   - Update implementation or tests accordingly

4. **Fix resource naming** (1 test)
   - Rename `inventorySummary` to `inventory_summary` OR update test regex

## 🔧 **Key Commands**

```bash
# Run specific test files
npm run test src/app/auth/__tests__/auth-routing.spec.tsx

# Run tests with verbose output
npm run test -- --reporter=verbose

# Run full CI verification
npm run ci:verify

# Check test coverage (if configured)
npm run test:coverage
```

## 📁 **Critical Files to Modify**

### **High Priority Files:**
- `src/app/auth/login/page.tsx` - Fix form labels
- `src/app/auth/register/page.tsx` - Fix form labels  
- `src/app/(main)/auth/v1/actions.spec.ts` - Mock headers
- `src/app/api/[resource]/[id]/route.ts` - Debug 404s
- `src/lib/data/resources/all-resources.ts` - Verify registration

### **Test Files:**
- `src/app/(main)/auth/v1/integration.spec.tsx` - Add React import
- `src/app/(main)/auth/v1/callback/route.spec.ts` - Fix mocks
- `src/app/api/[resource]/[id]/route.tally_cards.spec.ts` - Debug 404s
- `vitest.setup.ts` - Add clipboard mock

## ⚠️ **Important Notes**

1. **Working Agreement Compliance:** The CI infrastructure is working, but full test suite must pass for complete compliance

2. **Test Categories:** The handoff document categorizes failures by:
   - **High Priority:** 14 tests (accessibility, core functionality)
   - **Medium Priority:** 5 tests (API consistency, data integrity)  
   - **Low Priority:** 17 tests (trivial fixes, feature decisions)

3. **Business Logic Decisions:** Some failures require decisions:
   - Password strength component: implement or remove?
   - Pagination max: 500 or 2000?
   - Resource naming: snake_case or camelCase?

4. **Commit Strategy:** Commit after each category:
   ```bash
   git add .
   git commit -m "fix(tests): resolve [category name] failures"
   ```

## 🎯 **Success Criteria**

**You're done when:**
- ✅ `npm run test` shows 0 failures
- ✅ `npm run ci:verify` passes completely
- ✅ All tests pass in CI pipeline
- ✅ PR can be merged without bypassing requirements

## 🚨 **If You Get Stuck**

1. **Read the handoff document** - it has detailed solutions
2. **Check the Working Agreement** in `docs/cursor/working-agreement.md`
3. **Look at existing passing tests** for patterns
4. **Use the test output** - it often shows exactly what's wrong
5. **Commit frequently** - don't lose progress

## 📊 **Expected Timeline**
- **Phase 1:** 20 minutes (quick wins)
- **Phase 2:** 1.5 hours (auth fixes)  
- **Phase 3:** 1 hour (API/schema)
- **Total:** ~3-4 hours

## 🎉 **Final Steps**

1. **Run full verification:**
   ```bash
   npm run ci:verify
   ```

2. **Push and create PR:**
   ```bash
   git push origin fix/test-failures-M1
   gh pr create --title "fix(tests): resolve remaining 42 test failures" --body "Completes Working Agreement compliance by fixing all test failures"
   ```

3. **Monitor CI/Vercel checks**

4. **Merge when all green**

---

**Good luck! The foundation is solid - you just need to fix the remaining test failures to achieve 100% compliance! 🚀**

---

*This prompt was generated after successfully implementing CI guardrails and fixing 52 build verification tests. The remaining work is well-documented and should be straightforward to complete.*
