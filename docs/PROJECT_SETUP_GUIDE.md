# New Project Setup Guide

This guide walks you through the essential steps to get a new project up and running with Supabase, authentication, database tables, and UI components.

---

## Prerequisites

Before starting, ensure you have:
- A Supabase account and project created
- Node.js installed (v18 or higher recommended)
- Git configured
- Basic knowledge of SQL and TypeScript

---

## Step 1: Swap Out Supabase Credentials

### 1.1 Copy Environment Template

Copy the example environment file to create your local environment:

```bash
cp env.example .env.local
```

### 1.2 Get Your Supabase Credentials

1. Navigate to your Supabase project dashboard: https://supabase.com/dashboard/project/[your-project-ref]
2. Go to **Settings** → **API**
3. Copy the following values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE` (keep this secret!)

### 1.3 Update .env.local

Replace the placeholder values in `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase (server)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # Keep this secret!

NODE_ENV=development
```

**Important:** Never commit `.env.local` to version control.

---

## Step 2: Configure Supabase Authentication

### 2.1 Configure Redirect URLs

1. In your Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add the following **Redirect URLs**:
   - `http://localhost:3001/auth/callback`
   - `http://localhost:3001/auth/reset-password`
   - `http://localhost:3001/auth/v1/callback`
   - Your production URL (e.g., `https://yourdomain.com/auth/callback`)
   - Your production reset password URL (e.g., `https://yourdomain.com/auth/reset-password`)

### 2.2 Configure Email Provider

1. Go to **Authentication** → **Providers** → **Email**
2. Enable **Email provider**
3. Configure email templates if needed (optional)

### 2.3 Set Up Magic Link Auth (Optional but Recommended)

1. Under **Authentication** → **Email**, enable **"Enable email confirmations"**
2. Set **Email redirect URL** to: `http://localhost:3001/auth/callback`

### 2.4 Password Reset Configuration

1. Password reset functionality is enabled by default when email provider is configured
2. The default Supabase email template will be used for password reset emails
3. Ensure `/auth/reset-password` is added to your Redirect URLs (see 2.1 above)
4. Users can request password reset from the login page via "Forgot password?" link
5. After clicking the reset link in their email, users will be redirected to `/auth/reset-password` to set a new password
6. After successful password reset, users are redirected to login (not auto-logged in) for security

---

## Step 3: Create Core Database Tables

### 3.1 Create Users Table

In the Supabase SQL Editor, run:

```sql
-- Create users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  auth_id uuid references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id),
  role_code text,
  is_active boolean not null default true,
  is_roles_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Create indexes
create index idx_users_auth_id on public.users(auth_id);
create index idx_users_role_id on public.users(role_id);

-- RLS Policies
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = auth_id);

create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and is_roles_admin = true
    )
  );
```

### 3.2 Create Roles Table

```sql
-- Create roles table
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  role_name text not null,
  description text,
  is_active boolean not null default true,
  can_manage_roles boolean not null default false,
  can_manage_cards boolean not null default false,
  can_manage_entries boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.roles enable row level security;

-- Create default roles
insert into public.roles (role_code, role_name, description, can_manage_roles, can_manage_cards, can_manage_entries)
values
  ('admin', 'Administrator', 'Full system access', true, true, true),
  ('user', 'Standard User', 'Basic user access', false, false, true)
on conflict (role_code) do nothing;

-- RLS Policy: Anyone authenticated can view roles
create policy "Authenticated users can view roles"
  on public.roles for select
  using (auth.role() = 'authenticated');
```

### 3.3 Create Permissions System

```sql
-- Create permissions table
create table if not exists public.permissions (
  key text primary key,
  description text
);

-- Create role_permissions junction table
create table if not exists public.role_permissions (
  role_id uuid references public.roles(id) on delete cascade,
  permission_key text references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- Enable RLS
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Insert basic permissions
insert into public.permissions (key, description) values
  ('menu:dashboard', 'Access to dashboard'),
  ('menu:forms:users', 'Access to Users menu'),
  ('menu:forms:roles', 'Access to Roles menu'),
  ('resource:users:read', 'Read users'),
  ('resource:users:create', 'Create users'),
  ('resource:users:update', 'Update users'),
  ('resource:users:delete', 'Delete users'),
  ('resource:roles:read', 'Read roles'),
  ('resource:roles:create', 'Create roles'),
  ('resource:roles:update', 'Update roles'),
  ('resource:roles:delete', 'Delete roles'),
  ('admin:manage_users', 'Manage user accounts'),
  ('admin:manage_roles', 'Manage user roles')
on conflict (key) do nothing;

-- Assign permissions to admin role
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.role_code = 'admin'
on conflict do nothing;

-- Assign basic permissions to user role
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.role_code = 'user'
  and p.key in ('menu:dashboard', 'resource:users:read')
on conflict do nothing;

-- RLS Policies
create policy "Authenticated users can view permissions"
  on public.permissions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can view role_permissions"
  on public.role_permissions for select
  using (auth.role() = 'authenticated');
```

### 3.4 Verify Database Setup

Run this query to verify all tables exist and have data:

```sql
-- Verify setup
select 
  'users' as table_name, count(*) as row_count from public.users
union all
select 'roles', count(*) from public.roles
union all
select 'permissions', count(*) from public.permissions
union all
select 'role_permissions', count(*) from public.role_permissions;
```

You should see at least:
- `users`: 0 rows (if no users created yet)
- `roles`: 2 rows (admin, user)
- `permissions`: 13 rows
- `role_permissions`: at least 13 rows (admin permissions)

---

## Step 4: Create Your First Resource

### 4.1 Choose a Table

Pick one table from your database (e.g., `orders`, `products`, `customers`) that you want to build UI for. Ensure there's a 1:1 match between the table name and resource name.

**Example:** If your table is called `orders`, your resource should be `orders`.

### 4.2 Create Resource Config File

Create a new file: `src/lib/data/resources/[table-name].config.ts`

**Example for `orders` table:**

```typescript
// src/lib/data/resources/orders.config.ts
import type { ResourceConfig } from "../types";

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type OrderInput = {
  order_number: string;
  customer_name: string;
  total_amount?: number;
  status?: string;
};

const orders: ResourceConfig<Order, OrderInput> = {
  table: "orders",  // Must match database table name exactly
  pk: "id",
  select: "id, order_number, customer_name, total_amount, status, created_at, updated_at",
  search: ["order_number", "customer_name"],
  activeFlag: "status",  // Optional: used for filtering active records
  defaultSort: { column: "created_at" },

  fromInput: (input: OrderInput) => ({
    order_number: String(input.order_number).trim(),
    customer_name: String(input.customer_name).trim(),
    total_amount: input.total_amount ?? 0,
    status: input.status ?? "pending",
  }),

  toDomain: (row: unknown) => row as Order,

  schema: {
    fields: {
      id: { type: "uuid", readonly: true },
      order_number: { type: "text", write: true },
      customer_name: { type: "text", write: true },
      total_amount: { type: "number", write: true },
      status: { type: "text", write: true },
      created_at: { type: "timestamp", nullable: true, readonly: true },
      updated_at: { type: "timestamp", nullable: true, readonly: true },
    },
  },
};

export default orders;
```

### 4.3 Register Resource

Edit `src/lib/data/resources/index.ts` and add your resource:

```typescript
// Add to imports at the top
import orders from "./orders.config.ts";

// Add to the resources object
const resources = {
  // ... existing resources
  orders,  // ✅ Database table name as the key

  // ✅ Optional: Create friendly alias
  "order-management": orders,
};

// Add to named exports
export {
  // ... existing exports
  orders,
};
```

---

## Step 5: Validate Resource API

### 5.1 Start Dev Server

```bash
pnpm dev
```

The server should start on `http://localhost:3001`

### 5.2 Test API Endpoint in Browser

Visit the API endpoint in your browser:
- `http://localhost:3001/api/orders` (should return JSON data)

### 5.3 Test with Postman (Optional)

**GET Request:**
```
GET http://localhost:3001/api/orders
Headers: None required for read operations
```

**POST Request:**
```
POST http://localhost:3001/api/orders
Headers:
  Content-Type: application/json
Body:
{
  "order_number": "ORD-001",
  "customer_name": "John Doe",
  "total_amount": 99.99,
  "status": "pending"
}
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "...",
      "order_number": "ORD-001",
      "customer_name": "John Doe",
      "total_amount": 99.99,
      "status": "pending",
      "created_at": "2024-01-27T...",
      "updated_at": null
    }
  ]
}
```

**Common Issues:**
- **404 Not Found**: Resource not registered in `index.ts`
- **Permission denied**: Check RLS policies on the table
- **Table not found**: Verify table name matches in config file

---

## Step 6: Build the UI Components

### 6.1 Focus on Sidebar Navigation

The sidebar is usually in a layout file. Find it at:
- `src/app/(main)/layout.tsx` or
- `src/components/layout/sidebar.tsx`

Add your resource to the navigation menu:

```typescript
const menuItems = [
  // ... existing items
  {
    label: "Orders",
    href: "/forms/orders",
    icon: ShoppingCart,
    permission: "menu:forms:orders"
  },
];
```

### 6.2 Create View Orders Page

The system has an interactive page generator. For a quick manual setup, create:

**File:** `src/app/(main)/forms/orders/page.tsx`

```typescript
import type { Metadata } from "next";
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

export const metadata: Metadata = {
  title: "Orders",
};

export default async function OrdersPage(props: { searchParams?: Promise<any> | any }) {
  const sp = await props.searchParams;
  const page = parseInt(sp?.page || "1");
  const pageSize = parseInt(sp?.pageSize || "10");

  const { rows, total } = await fetchResourcePage<any>({
    endpoint: "/api/orders",
    page,
    pageSize,
    extraQuery: { raw: "true" },
  });

  return (
    <PageShell
      title="Orders"
      count={total}
      toolbarConfig={{}}
      toolbarActions={[]}
      chipConfig={[]}
      enableAdvancedFilters={true}
    >
      <ResourceTableClient
        config={{
          columns: [
            { key: "order_number", label: "Order #", sortable: true, filterable: true },
            { key: "customer_name", label: "Customer", sortable: true, filterable: true },
            { key: "total_amount", label: "Amount", sortable: true },
            { key: "status", label: "Status", sortable: true, filterable: true },
            { key: "created_at", label: "Created", sortable: true },
          ],
        }}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
```

### 6.3 Visit the Page

Navigate to: `http://localhost:3001/forms/orders`

You should see:
- ✅ Sidebar with "Orders" menu item
- ✅ Table showing your orders data
- ✅ Pagination controls
- ✅ Filter/search functionality
- ✅ Sortable columns

---

## Step 7: Build the Dashboard

### 7.1 Create Dashboard Layout

**File:** `src/app/(main)/dashboard/page.tsx`

```typescript
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Fetch summary data
  const stats = [
    { label: "Total Orders", value: "1,234", trend: "+12%" },
    { label: "Revenue", value: "$45,678", trend: "+8%" },
    { label: "Customers", value: "567", trend: "+5%" },
    { label: "Pending", value: "23", trend: "-3%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.trend}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Latest orders from your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add a simple table or list of recent orders */}
            <p className="text-sm text-muted-foreground">
              Recent orders will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 7.2 Access Dashboard

Visit: `http://localhost:3001/dashboard`

You should see:
- ✅ Dashboard header
- ✅ Statistics cards
- ✅ Recent activity section

---

## Verification Checklist

Before considering your setup complete, verify:

- [ ] Environment variables configured in `.env.local`
- [ ] Supabase redirect URLs configured in dashboard
- [ ] Database tables created (users, roles, permissions, role_permissions)
- [ ] At least one resource config file created
- [ ] Resource registered in `index.ts`
- [ ] API endpoint returns data in browser/Postman
- [ ] Sidebar navigation includes your resource
- [ ] View page renders correctly at `/forms/[resource]`
- [ ] Dashboard page renders at `/dashboard`
- [ ] No console errors in browser DevTools
- [ ] No TypeScript errors (`pnpm typecheck`)

---

## Next Steps

Once your basic setup is working:

1. **Add More Resources**: Repeat Step 4 for additional tables
2. **Customize Permissions**: Add more granular permissions for your domain
3. **Build Forms**: Create edit/create forms using the form builder
4. **Add Relationships**: Configure foreign key relationships between resources
5. **Set Up Row-Level Security**: Add RLS policies for data isolation
6. **Add Dashboards**: Create domain-specific dashboard views

---

## Troubleshooting

### "Cannot find module" errors
- Ensure resource is registered in `src/lib/data/resources/index.ts`
- Check file paths match exactly

### "Permission denied" errors
- Verify RLS policies allow the current user to access the table
- Check if the user has the required role and permissions

### API returns empty arrays
- Verify table has data: query in Supabase SQL Editor
- Check RLS policies aren't too restrictive
- Verify `select` statement in config includes the right columns

### Sidebar not showing menu items
- Check if navigation component is importing from the right file
- Verify user has required permissions for menu access
- Check middleware isn't blocking the page

### Build errors
- Run `pnpm typecheck` to find TypeScript errors
- Verify all imports are correct
- Check that resource types are properly exported

---

## Additional Resources

- [Resource Page Generator Documentation](./resource-page-generator.md)
- [Permissions System Documentation](./permissions-system.md)
- [Supabase CLI Setup](./scripts/README-SUPABASE-CLI.md)
- [Working Agreement](../README.md#cursor-working-agreement)

---

## Support

If you encounter issues not covered here:
1. Check the browser console for errors
2. Check the terminal for build/runtime errors
3. Review the Supabase dashboard logs
4. Consult the troubleshooting section above
5. Check other project documentation files





