# New Project Setup - User Stories

This document breaks down the new project setup process into small, validatedle user stories that can be completed incrementally.

---

## Epic Overview

**Epic:** New Project Infrastructure Setup  
**Goal:** Establish a fully functional project with authentication, database, and UI components  
**Timeline:** ~5-10 days (depending on complexity)  
**Success Criteria:** All stories completed, working dashboard, and API endpoints validated

---

## Story Map

```
Foundation (Day 1-2)
├── Environment & Credentials
│   ├── US-001: Configure Supabase credentials
│   └── US-002: Validate Supabase connection
├── Authentication Setup
│   ├── US-003: Configure auth redirect URLs
│   └── US-004: Test authentication flow

Database (Day 2-3)
├── Core Tables
│   ├── US-005: Create users table
│   ├── US-006: Create roles & permissions
│   └── US-007: Verify database schema

API Layer (Day 3-4)
├── Resource Setup
│   ├── US-008: Create first resource config
│   ├── US-009: Register resource in system
│   └── US-010: Validate API endpoints

UI Layer (Day 4-5)
├── Navigation
│   ├── US-011: Build sidebar navigation
│   └── US-012: Add resource menu item
├── Views
│   ├── US-013: Create resource view page
│   ├── US-014: Display data in table
│   └── US-015: Add filtering & sorting
└── Dashboard
    ├── US-016: Create dashboard page
    └── US-017: Display summary statistics
```

---

## User Stories

### Foundation Phase

#### US-001: Configure Supabase Credentials
**As a** developer  
**I want to** configure Supabase credentials in my local environment  
**So that** the application can connect to the database

**Acceptance Criteria:**
- [ ] `.env.local` file exists in project root
- [ ] All required Supabase variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `.env.local` is in `.gitignore`
- [ ] No sensitive credentials are committed to git

**Validation:**
```bash
# Run this validation command
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ URL set' : '❌ URL missing')"
```

**Story Size:** ⭐ (1 point)  
**Dependencies:** None  
**Phase:** Foundation

---

#### US-002: Validate Supabase Connection
**As a** developer  
**I want to** verify the Supabase connection works  
**So that** I know the configuration is correct

**Acceptance Criteria:**
- [ ] Dev server starts without Supabase errors
- [ ] No console errors about missing credentials
- [ ] Can access Supabase dashboard for the project
- [ ] `pnpm typecheck` passes

**Validation:**
```bash
# Start dev server
pnpm dev

# Should see: "Ready on http://localhost:3001"
# Should NOT see: "Missing NEXT_PUBLIC_SUPABASE_URL"
```

**Story Size:** ⭐ (1 point)  
**Dependencies:** US-001  
**Phase:** Foundation

---

#### US-003: Configure Auth Redirect URLs
**As a** developer  
**I want to** configure authentication redirect URLs in Supabase  
**So that** users can authenticate successfully

**Acceptance Criteria:**
- [ ] Localhost redirect URL configured: `http://localhost:3001/auth/callback`
- [ ] Legacy redirect URL configured: `http://localhost:3001/auth/v1/callback`
- [ ] Production redirect URL configured (if deploying)
- [ ] Email provider enabled in Supabase dashboard

**Validation:**
- Open Supabase Dashboard → Authentication → URL Configuration
- Verify all URLs are listed and saved

**Story Size:** ⭐ (1 point)  
**Dependencies:** US-001  
**Phase:** Foundation

---

#### US-004: Test Authentication Flow
**As a** developer  
**I want to** test the complete authentication flow  
**So that** I know users can log in

**Acceptance Criteria:**
- [ ] Can visit `/auth/login` without errors
- [ ] Can submit email for magic link
- [ ] Can access callback URL without errors
- [ ] No authentication-related console errors

**Validation:**
```bash
# Manual test
1. Visit http://localhost:3001/auth/login
2. Enter test email
3. Submit form
4. Should see success message or redirect
```

**Story Size:** ⭐ (1 point)  
**Dependencies:** US-001, US-003  
**Phase:** Foundation

---

### Database Phase

#### US-005: Create Users Table
**As a** developer  
**I want to** create the users table with proper schema  
**So that** I can store user information

**Acceptance Criteria:**
- [ ] `public.users` table created in Supabase
- [ ] Table has required columns: `id`, `full_name`, `auth_id`, `role_id`, `is_active`
- [ ] Foreign key to `auth.users(id)` is configured
- [ ] RLS policies are enabled and functional
- [ ] Indexes created on `auth_id` and `role_id`

**Validation:**
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public';

-- Should see all expected columns
```

**Story Size:** ⭐⭐ (2 points)  
**Dependencies:** US-002  
**Phase:** Database

---

#### US-006: Create Roles & Permissions
**As a** developer  
**I want to** create roles and permissions tables  
**So that** I can implement role-based access control

**Acceptance Criteria:**
- [ ] `roles` table created with columns: `id`, `role_code`, `role_name`, `is_active`
- [ ] `permissions` table created with columns: `key`, `description`
- [ ] `role_permissions` junction table created
- [ ] Default roles exist: `admin`, `user`
- [ ] At least 10 permissions created and assigned to roles
- [ ] RLS policies configured for all tables

**Validation:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM roles;
SELECT * FROM permissions ORDER BY key;
SELECT rp.*, r.role_code, p.key 
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_key = p.key;

-- Should see: 2 roles, 10+ permissions, 10+ role_permissions rows
```

**Story Size:** ⭐⭐⭐ (3 points)  
**Dependencies:** US-005  
**Phase:** Database

---

#### US-007: Verify Database Schema
**As a** developer  
**I want to** verify the complete database schema is correct  
**So that** all relationships and constraints work properly

**Acceptance Criteria:**
- [ ] All tables have primary keys
- [ ] Foreign key relationships are valid
- [ ] All indexes are created
- [ ] RLS is enabled on all user-facing tables
- [ ] `pnpm typecheck` passes
- [ ] No SQL errors in console

**Validation:**
```bash
# TypeScript validation
pnpm typecheck

# Database validation (in Supabase SQL Editor)
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_type = 'PRIMARY KEY' 
   AND table_name = t.table_name) as has_pk,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND table_name = t.table_name) as fk_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('users', 'roles', 'permissions', 'role_permissions');
```

**Story Size:** ⭐ (1 point)  
**Dependencies:** US-005, US-006  
**Phase:** Database

---

### API Layer Phase

#### US-008: Create First Resource Config
**As a** developer  
**I want to** create a resource configuration file  
**So that** I can expose my database table through the API

**Acceptance Criteria:**
- [ ] Resource config file created: `src/lib/data/resources/[table].config.ts`
- [ ] Config exports TypeScript types for the resource
- [ ] Config implements `ResourceConfig` interface
- [ ] Includes: `table`, `pk`, `select`, `toDomain`, `schema` fields
- [ ] `fromInput` function defined
- [ ] No TypeScript errors

**Validation:**
```bash
# Check file exists and imports correctly
pnpm typecheck

# Should see no errors related to resource config
```

**Story Size:** ⭐⭐ (2 points)  
**Dependencies:** US-007  
**Phase:** API Layer

---

#### US-009: Register Resource in System
**As a** developer  
**I want to** register my resource in the application  
**So that** it's discoverable by the API

**Acceptance Criteria:**
- [ ] Resource imported in `src/lib/data/resources/index.ts`
- [ ] Resource added to `resources` object
- [ ] Resource added to named exports
- [ ] No TypeScript errors
- [ ] `pnpm typecheck` passes

**Validation:**
```bash
# Verify no errors
pnpm typecheck

# Test that resource is registered (in browser console or terminal)
node -e "
  const resources = require('./src/lib/data/resources/index.ts');
  console.log('Resources:', Object.keys(resources));
"
```

**Story Size:** ⭐ (1 point)  
**Dependencies:** US-008  
**Phase:** API Layer

---

#### US-010: Validate API Endpoints
**As a** developer  
**I want to** test that API endpoints work correctly  
**So that** I know the resource is accessible

**Acceptance Criteria:**
- [ ] GET `/api/[resource]` returns 200 status
- [ ] Response includes `rows` array and `total` count
- [ ] Can filter by query parameters (if applicable)
- [ ] Can paginate results
- [ ] POST `/api/[resource]` creates new records
- [ ] All tests pass

**Validation:**
```bash
# Start dev server
pnpm dev

# Test GET in browser or Postman
curl http://localhost:3001/api/your-resource

# Should return JSON with { rows: [], total: 0 }
```

**Story Size:** ⭐⭐⭐ (3 points)  
**Dependencies:** US-009  
**Phase:** API Layer

---

### UI Layer Phase

#### US-011: Build Sidebar Navigation
**As a** developer  
**I want to** create the sidebar navigation component  
**So that** users can navigate between pages

**Acceptance Criteria:**
- [ ] Sidebar component exists and renders
- [ ] Dashboard menu item displays
- [ ] Navigation works without errors
- [ ] Responsive on mobile/tablet
- [ ] No console errors
- [ ] `pnpm typecheck` passes

**Validation:**
```bash
# Visit localhost:3001
# Should see sidebar on left side
# Click "Dashboard" - should navigate
# Check browser console - no errors
```

**Story Size:** ⭐⭐ (2 points)  
**Dependencies:** None (can work in parallel)  
**Phase:** UI Layer

---

#### US-012: Add Resource Menu Item
**As a** developer  
**I want to** add my resource to the sidebar menu  
**So that** users can access it

**Acceptance Criteria:**
- [ ] Menu item added to navigation config
- [ ] Display name is user-friendly
- [ ] Links to correct `/forms/[resource]` path
- [ ] Icon displays correctly
- [ ] Click navigates to correct page
- [ ] Permission check works (if applicable)

**Validation:**
```bash
# Visit localhost:3001
# Should see new menu item in sidebar
# Click it - should navigate to resource page
```

**Story Size:** ⭐ (1 point)  
**Dependencies:** US-011  
**Phase:** UI Layer

---

#### US-013: Create Resource View Page
**As a** developer  
**I want to** create a view page for my resource  
**So that** users can see the data

**Acceptance Criteria:**
- [ ] Page created: `src/app/(main)/forms/[resource]/page.tsx`
- [ ] Page imports and uses `PageShell` component
- [ ] Page fetches data from API
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Page renders correctly

**Validation:**
```bash
# Visit http://localhost:3001/forms/your-resource
# Should see page with title and table
# Should NOT see error page
```

**Story Size:** ⭐⭐ (2 points)  
**Dependencies:** US-009  
**Phase:** UI Layer

---

#### US-014: Display Data in Table
**As a** developer  
**I want to** display resource data in a table  
**So that** users can view records

**Acceptance Criteria:**
- [ ] Data displays in table format
- [ ] All columns render correctly
- [ ] Pagination works
- [ ] Shows correct total count
- [ ] Loading state displays while fetching
- [ ] No empty state shows when there's data

**Validation:**
```bash
# Ensure database has at least 1 record
# Visit resource page
# Should see table with data
# Should see pagination controls
```

**Story Size:** ⭐⭐ (2 points)  
**Dependencies:** US-013  
**Phase:** UI Layer

---

#### US-015: Add Filtering & Sorting
**As a** developer  
**I want to** add filtering and sorting to the table  
**So that** users can find data easily

**Acceptance Criteria:**
- [ ] Can sort by any column
- [ ] Sort indicators display correctly
- [ ] Can filter by search terms
- [ ] Filter persists across pagination
- [ ] URL parameters update with filters
- [ ] No console errors

**Validation:**
```bash
# Visit resource page
# Click column header - should sort
# Type in search box - should filter
# Change page - filters should persist
# Check URL - should see query params
```

**Story Size:** ⭐⭐⭐ (3 points)  
**Dependencies:** US-014  
**Phase:** UI Layer

---

#### US-016: Create Dashboard Page
**As a** developer  
**I want to** create a dashboard page  
**So that** users can see key metrics

**Acceptance Criteria:**
- [ ] Dashboard page exists: `src/app/(main)/dashboard/page.tsx`
- [ ] Page displays statistics cards
- [ ] At least 4 metric cards shown
- [ ] Data is mocked or fetched from API
- [ ] No TypeScript errors
- [ ] Page renders correctly

**Validation:**
```bash
# Visit http://localhost:3001/dashboard
# Should see dashboard with metric cards
# Should NOT see error page
```

**Story Size:** ⭐⭐ (2 points)  
**Dependencies:** None  
**Phase:** UI Layer

---

#### US-017: Display Summary Statistics
**As a** developer  
**I want to** display summary statistics on the dashboard  
**So that** users can see key metrics at a glance

**Acceptance Criteria:**
- [ ] Statistics fetch from real API endpoints
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] Cards update with real data
- [ ] Data refreshes appropriately
- [ ] No console errors

**Validation:**
```bash
# Visit dashboard
# Should see real data (not just placeholders)
# Check network tab - should see API calls
# Refresh page - data should reload
```

**Story Size:** ⭐⭐ (2 points)  
**Dependencies:** US-010, US-016  
**Phase:** UI Layer

---

## Validation Checklist

Before considering the project setup complete, verify:

**Foundation:**
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] Dev server starts without errors

**Authentication:**
- [ ] Can log in via email magic link
- [ ] Can log out
- [ ] Session persists across page reloads
- [ ] Unauthenticated users redirected to login

**Database:**
- [ ] All tables have data
- [ ] RLS policies work correctly
- [ ] Foreign keys enforce referential integrity
- [ ] No SQL errors in logs

**API:**
- [ ] All resource endpoints return 200
- [ ] CORS headers configured correctly
- [ ] Error responses are user-friendly
- [ ] Authentication required for protected routes

**UI:**
- [ ] All pages render without errors
- [ ] Navigation works correctly
- [ ] Tables display data properly
- [ ] Forms validate input correctly
- [ ] Loading and error states work
- [ ] Responsive on mobile devices

**Testing:**
- [ ] `pnpm test` passes
- [ ] `pnpm test:e2e:smoke` passes
- [ ] Coverage is >80% for new code
- [ ] No regressions in existing tests

---

## Sprint Planning Guidance

### Sprint 1: Foundation (Days 1-2)
**Goal:** Get Supabase connected and authentication working  
**Stories:** US-001 through US-004  
**Velocity:** ~4 points

**Daily Standup Check:**
- Did dev server start successfully?
- Any environment configuration issues?
- Can you authenticate?

### Sprint 2: Database (Days 2-3)
**Goal:** Create all core database tables  
**Stories:** US-005 through US-007  
**Velocity:** ~6 points

**Daily Standup Check:**
- Are all tables created?
- Can you query data successfully?
- Any SQL errors?

### Sprint 3: API (Days 3-4)
**Goal:** Expose at least one resource through API  
**Stories:** US-008 through US-010  
**Velocity:** ~6 points

**Daily Standup Check:**
- Is first resource working?
- Can you hit API endpoints?
- Any 404s or errors?

### Sprint 4: UI (Days 4-5)
**Goal:** Build navigation and first view page  
**Stories:** US-011 through US-015  
**Velocity:** ~10 points

**Daily Standup Check:**
- Can you navigate between pages?
- Is data displaying correctly?
- Any console errors?

### Sprint 5: Dashboard (Days 5-6)
**Goal:** Complete dashboard with real data  
**Stories:** US-016 through US-017  
**Velocity:** ~4 points

**Daily Standup Check:**
- Dashboard displaying data?
- All features working?
- Ready to demo?

---

## Definition of Done

A user story is considered "Done" when:

1. ✅ All acceptance criteria met
2. ✅ Code review completed
3. ✅ Tests written and passing
4. ✅ No TypeScript errors
5. ✅ No linting errors
6. ✅ Build succeeds
7. ✅ Manual testing completed
8. ✅ Documentation updated (if needed)
9. ✅ No console errors
10. ✅ Vercel preview deployed (if applicable)

---

## Risk Mitigation

**High Risk Stories:**
- **US-006** (Roles & Permissions): Complex schema, many relationships
  - *Mitigation:* Test incrementally, verify each table separately
- **US-010** (API Validation): Many integration points
  - *Mitigation:* Test one endpoint at a time, use Postman

**Medium Risk Stories:**
- **US-013** (View Page): Requires understanding of components
  - *Mitigation:* Copy from existing working example
- **US-015** (Filtering): Can have performance impact
  - *Mitigation:* Start with basic filtering, optimize later

**Low Risk Stories:**
- **US-001, US-002, US-003**: Simple configuration
- **US-011**: Can copy from existing codebase
- **US-016**: Dashboard can start with mock data

---

## Success Metrics

**Time to First Working Page:**
- Target: <3 days
- Measurement: First successful view page render

**Zero Regressions:**
- Target: 100% passing tests
- Measurement: `pnpm ci:verify` success rate

**Code Quality:**
- Target: <5 TypeScript errors
- Measurement: `pnpm typecheck` output

**User Satisfaction:**
- Target: Can complete basic tasks without help
- Measurement: Internal testing feedback

---

## Next Steps After Completion

Once all stories are done:
1. Add more resources following the same pattern
2. Build CRUD forms for creating/editing records
3. Add relationships between resources
4. Implement advanced features (bulk actions, exports)
5. Add additional dashboard widgets
6. Set up production deployment
7. Configure monitoring and logging





