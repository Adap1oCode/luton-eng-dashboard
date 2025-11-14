# Future Enhancements - Quick Checklist

Quick reference checklist for implementing RBAC enhancements. See `future-enhancements.md` for detailed implementation guides.

## 1. Permission Invalidation/Refresh Mechanism

### Files to Create/Modify
- [ ] `src/contexts/permissions-context.tsx` - Create context provider
- [ ] `src/lib/permissions/invalidation.ts` - Create WebSocket/SSE listener (optional)
- [ ] `src/app/(main)/_components/sidebar/permission-refresh-button.tsx` - Create refresh button
- [ ] `src/app/(main)/layout.tsx` - Wrap with PermissionsProvider
- [ ] `src/app/(main)/_components/sidebar/app-sidebar.tsx` - Use context instead of hook

### Testing
- [ ] Test permission refresh when admin updates role
- [ ] Test WebSocket connection stability
- [ ] Test with multiple browser tabs
- [ ] Verify no memory leaks

---

## 2. Loading State for Permission Fetch

### Files to Create/Modify
- [ ] `src/components/access/permission-loading.tsx` - Create loading/error components
- [ ] `src/components/access/permission-error.tsx` - Create error with retry component
- [ ] `src/app/(main)/_components/sidebar/app-sidebar.tsx` - Add loading states

### Testing
- [ ] Verify loading skeleton appears
- [ ] Test error state
- [ ] Test retry functionality
- [ ] Test with slow network

---

## 3. Permission Constants/Enum for Type Safety

### Files to Create/Modify
- [ ] `src/lib/permissions/constants.ts` - Create permission constants
- [ ] `src/lib/access/guards.ts` - Update to use constants
- [ ] `src/navigation/sidebar/sidebar-items.ts` - Update to use constants
- [ ] `scripts/validate-permissions.ts` - Create validation script
- [ ] Update all existing permission strings throughout codebase

### Testing
- [ ] Verify TypeScript catches typos
- [ ] Test autocomplete in IDE
- [ ] Run validation script
- [ ] Verify all guards work correctly

---

## 4. Analytics to Track Permission-Related Errors

### Files to Create/Modify
- [ ] `src/lib/analytics/permissions-analytics.ts` - Create analytics service
- [ ] `src/app/api/analytics/permissions/route.ts` - Create API endpoint
- [ ] `src/lib/access/route-guards.ts` - Add tracking calls
- [ ] `src/contexts/permissions-context.tsx` - Add tracking calls
- [ ] `src/app/(main)/admin/analytics/permissions/page.tsx` - Create dashboard (optional)
- [ ] Database migration for `permission_analytics` table

### Testing
- [ ] Verify events are tracked
- [ ] Test analytics endpoint
- [ ] Verify events stored in database
- [ ] Test analytics dashboard (if created)
- [ ] Verify no PII in events

---

## Implementation Order Recommendation

1. **Start with #3 (Permission Constants)** - Easiest, prevents bugs
2. **Then #2 (Loading States)** - Improves UX immediately
3. **Then #1 (Invalidation)** - More complex, requires WebSocket setup
4. **Finally #4 (Analytics)** - Can be added incrementally

---

## Quick Commands

```bash
# Validate permissions sync
tsx scripts/validate-permissions.ts

# Run type checking
npm run type-check

# Test permission refresh
# 1. Login as admin
# 2. Update user role
# 3. Verify sidebar updates without refresh
```

---

## Questions to Answer Before Implementation

- [ ] Do we need real-time permission updates, or is refresh button sufficient?
- [ ] Which analytics service will we use? (PostHog, Mixpanel, custom?)
- [ ] Should permission constants be auto-generated from database?
- [ ] Do we need permission change audit logs?
- [ ] Should analytics be opt-in or always on?






