# Project Setup Quick Reference

A one-page cheat sheet for setting up a new project.

---

## 🚀 Quick Setup Checklist

### 1. Environment Setup (5 min)
```bash
cp env.example .env.local
```
Fill in from Supabase Dashboard → Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Supabase Authentication (3 min)
Dashboard → Authentication → URL Configuration
Add redirect URLs:
- `http://localhost:3001/auth/callback`
- `http://localhost:3001/auth/v1/callback`
- Production URL

### 3. Database Tables (10 min)
Run these SQL scripts in order:
1. `users` table with RLS
2. `roles` table with default roles (admin, user)
3. `permissions` table with 13 basic permissions
4. `role_permissions` junction table
5. Verify with count query

### 4. Create Resource (15 min)
```bash
# Create config file
src/lib/data/resources/your_table.config.ts

# Register in index.ts
import your_table from "./your_table.config.ts";

# Test API endpoint
http://localhost:3001/api/your_table
```

### 5. Build UI (20 min)
1. Add to sidebar navigation
2. Create view page: `src/app/(main)/forms/your-table/page.tsx`
3. Create dashboard: `src/app/(main)/dashboard/page.tsx`
4. Visit: `http://localhost:3001/forms/your-table`

---

## 📝 Key SQL Templates

### Users Table
```sql
create table public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  auth_id uuid references auth.users(id),
  role_id uuid references public.roles(id),
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### Roles Table
```sql
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  role_code text unique not null,
  role_name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### Permissions
```sql
create table public.permissions (
  key text primary key,
  description text
);
```

---

## 🔧 Resource Config Template

```typescript
// src/lib/data/resources/your_table.config.ts
import type { ResourceConfig } from "../types";

export type YourType = {
  id: string;
  name: string;
  created_at: string | null;
  // ... other fields
};

export type YourTypeInput = {
  name: string;
  // ... other fields
};

const your_table: ResourceConfig<YourType, YourTypeInput> = {
  table: "your_table",
  pk: "id",
  select: "id, name, created_at, updated_at",
  search: ["name"],
  defaultSort: { column: "created_at" },

  fromInput: (input: YourTypeInput) => ({
    name: String(input.name).trim(),
  }),

  toDomain: (row: unknown) => row as Order,
  
  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      name: { type: "text", write: true },
      created_at: { type: "timestamp", readonly: true },
    },
  },
};

export default your_table;
```

---

## 🧪 Validation Commands

```bash
# TypeScript check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Test
pnpm test

# Full verify
pnpm ci:verify
```

---

## 🔗 Important URLs

- **Local Dev:** http://localhost:3001
- **API Endpoint:** http://localhost:3001/api/[resource]
- **Form Page:** http://localhost:3001/forms/[resource]
- **Dashboard:** http://localhost:3001/dashboard
- **Supabase SQL Editor:** https://supabase.com/dashboard/project/[ref]/sql

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| 404 on API | Register resource in `index.ts` |
| Permission denied | Check RLS policies in Supabase |
| Empty data | Verify table has rows in SQL Editor |
| Type errors | Run `pnpm typecheck` and fix |
| Menu not showing | Check navigation permissions |

---

## 📚 See Also

- [Full Setup Guide](./PROJECT_SETUP_GUIDE.md) - Detailed step-by-step instructions
- [Resource Generator](./resource-page-generator.md) - Automated page generation
- [Permissions System](./permissions-system.md) - Permission setup details
- [Supabase CLI](./scripts/README-SUPABASE-CLI.md) - CLI setup and migrations





