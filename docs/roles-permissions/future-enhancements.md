# RBAC Future Enhancements Guide

This document outlines the implementation plan for future enhancements to the RBAC (Role-Based Access Control) system. Each enhancement is designed to be implemented independently, allowing for incremental improvements.

---

## 1. Permission Invalidation/Refresh Mechanism

### Overview
Currently, permissions are fetched once during SSR and cached. If permissions change during a user's session (e.g., admin updates user role), the sidebar and UI won't reflect changes until page refresh. This enhancement adds a mechanism to invalidate and refresh permissions in real-time.

### Implementation Plan

#### Step 1: Create Permission Context Provider
**File:** `src/contexts/permissions-context.tsx`

```typescript
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { usePermissions } from "@/components/auth/permissions-gate";

type PermissionsContextType = {
  permissions: string[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidate: () => void;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ 
  children, 
  initialPermissions = [] 
}: { 
  children: React.ReactNode;
  initialPermissions?: string[];
}) {
  const { list, isLoading, error, mutate } = usePermissions();
  const [serverPermissions] = useState(initialPermissions);
  
  // Use server permissions if available, otherwise use client-fetched
  const permissions = serverPermissions.length > 0 ? serverPermissions : list;
  
  const refresh = useCallback(async () => {
    await mutate(); // Revalidate SWR cache
  }, [mutate]);
  
  const invalidate = useCallback(() => {
    mutate(undefined, { revalidate: false }); // Clear cache
  }, [mutate]);
  
  return (
    <PermissionsContext.Provider value={{ permissions, isLoading, error, refresh, invalidate }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissionsContext must be used within PermissionsProvider");
  }
  return context;
}
```

#### Step 2: Add WebSocket/Server-Sent Events Support (Optional)
**File:** `src/lib/permissions/invalidation.ts`

```typescript
/**
 * Listen for permission changes via WebSocket or Server-Sent Events
 * This allows real-time updates when admin changes user permissions
 */
export function setupPermissionInvalidation(onInvalidate: () => void) {
  // Option 1: WebSocket
  if (typeof window !== "undefined") {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/permissions`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "permissions_changed") {
        onInvalidate();
      }
    };
    
    return () => ws.close();
  }
  
  // Option 2: Server-Sent Events (simpler, one-way)
  // Option 3: Polling (fallback, less efficient)
}
```

#### Step 3: Add Manual Refresh Button (Admin Only)
**File:** `src/app/(main)/_components/sidebar/permission-refresh-button.tsx`

```typescript
"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissionsContext } from "@/contexts/permissions-context";
import { useAccess } from "@/lib/access/useAccess";
import { toast } from "sonner";

export function PermissionRefreshButton() {
  const { refresh, isLoading } = usePermissionsContext();
  const { guards } = useAccess();
  
  // Only show for admins
  if (!guards?.has("admin:read:any")) {
    return null;
  }
  
  const handleRefresh = async () => {
    try {
      await refresh();
      toast.success("Permissions refreshed");
    } catch (error) {
      toast.error("Failed to refresh permissions");
    }
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isLoading}
      title="Refresh permissions"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
    </Button>
  );
}
```

#### Step 4: Integrate into Layout
**File:** `src/app/(main)/layout.tsx`

```typescript
// Wrap children with PermissionsProvider
<PermissionsProvider initialPermissions={permissions}>
  <SidebarProvider>
    {/* ... existing code ... */}
  </SidebarProvider>
</PermissionsProvider>
```

#### Step 5: Update Sidebar to Use Context
**File:** `src/app/(main)/_components/sidebar/app-sidebar.tsx`

```typescript
import { usePermissionsContext } from "@/contexts/permissions-context";

export function AppSidebar({ permissions: serverPermissions, ...props }) {
  const { permissions } = usePermissionsContext();
  const filteredNav = filterNavGroups(sidebarItems, permissions);
  // ... rest of component
}
```

### Testing Checklist
- [ ] Verify permissions refresh when admin updates user role
- [ ] Test WebSocket connection stability
- [ ] Verify no memory leaks from event listeners
- [ ] Test with multiple browser tabs (should sync)
- [ ] Verify fallback to polling if WebSocket unavailable

---

## 2. Loading State for Permission Fetch

### Overview
Currently, permission fetching failures are silent. This enhancement adds proper loading states and error handling to provide user feedback.

### Implementation Plan

#### Step 1: Create Loading Component
**File:** `src/components/access/permission-loading.tsx`

```typescript
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function PermissionLoadingSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function PermissionErrorAlert({ error }: { error: Error | null }) {
  if (!error) return null;
  
  return (
    <Alert variant="destructive" className="m-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Failed to load permissions. Some features may be unavailable.
        <br />
        <small className="text-xs opacity-75">{error.message}</small>
      </AlertDescription>
    </Alert>
  );
}
```

#### Step 2: Update Sidebar with Loading States
**File:** `src/app/(main)/_components/sidebar/app-sidebar.tsx`

```typescript
import { PermissionLoadingSkeleton, PermissionErrorAlert } from "@/components/access/permission-loading";
import { usePermissionsContext } from "@/contexts/permissions-context";

export function AppSidebar({ permissions: serverPermissions, ...props }) {
  const { permissions, isLoading, error } = usePermissionsContext();
  
  // Show loading skeleton if no server permissions and still loading
  if (!serverPermissions?.length && isLoading) {
    return (
      <Sidebar {...props} className="border-r">
        <SidebarHeader className="border-b">
          <Skeleton className="h-12 w-full" />
        </SidebarHeader>
        <SidebarContent>
          <PermissionLoadingSkeleton />
        </SidebarContent>
      </Sidebar>
    );
  }
  
  const filteredNav = filterNavGroups(sidebarItems, permissions);
  
  return (
    <Sidebar {...props} className="border-r">
      {/* ... existing code ... */}
      <SidebarContent>
        {error && <PermissionErrorAlert error={error} />}
        <NavMain items={filteredNav} />
      </SidebarContent>
    </Sidebar>
  );
}
```

#### Step 3: Add Retry Mechanism
**File:** `src/components/access/permission-error.tsx`

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { usePermissionsContext } from "@/contexts/permissions-context";

export function PermissionErrorWithRetry({ error }: { error: Error | null }) {
  const { refresh, isLoading } = usePermissionsContext();
  
  if (!error) return null;
  
  return (
    <div className="p-4 space-y-2">
      <p className="text-sm text-muted-foreground">
        Failed to load permissions. Please try again.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => refresh()}
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
        Retry
      </Button>
    </div>
  );
}
```

### Testing Checklist
- [ ] Verify loading skeleton appears during initial load
- [ ] Test error state when API fails
- [ ] Verify retry button works
- [ ] Test with slow network (throttle in DevTools)
- [ ] Verify no flickering between states

---

## 3. Permission Constants/Enum for Type Safety

### Overview
Currently, permissions are strings like `"screen:tally-cards:view"`. This enhancement creates type-safe constants and enums to prevent typos and improve developer experience.

### Implementation Plan

#### Step 1: Create Permission Constants
**File:** `src/lib/permissions/constants.ts`

```typescript
/**
 * Permission key constants for type safety
 * Format: SCREEN_ACTION
 * Example: TALLY_CARDS_VIEW = "screen:tally-cards:view"
 */

// Screen names
export const SCREENS = {
  TALLY_CARDS: "tally-cards",
  STOCK_ADJUSTMENTS: "stock-adjustments",
  STOCK_COMPARE: "stock-compare",
  // Add more screens as needed
} as const;

// Actions
export const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  EXPORT: "export",
} as const;

// Permission key builder
export function buildPermissionKey(screen: string, action: string): string {
  return `screen:${screen}:${action}`;
}

// Pre-built permission keys
export const PERMISSIONS = {
  // Tally Cards
  TALLY_CARDS_VIEW: buildPermissionKey(SCREENS.TALLY_CARDS, ACTIONS.VIEW),
  TALLY_CARDS_CREATE: buildPermissionKey(SCREENS.TALLY_CARDS, ACTIONS.CREATE),
  TALLY_CARDS_UPDATE: buildPermissionKey(SCREENS.TALLY_CARDS, ACTIONS.UPDATE),
  TALLY_CARDS_DELETE: buildPermissionKey(SCREENS.TALLY_CARDS, ACTIONS.DELETE),
  TALLY_CARDS_EXPORT: buildPermissionKey(SCREENS.TALLY_CARDS, ACTIONS.EXPORT),
  
  // Stock Adjustments
  STOCK_ADJUSTMENTS_VIEW: buildPermissionKey(SCREENS.STOCK_ADJUSTMENTS, ACTIONS.VIEW),
  STOCK_ADJUSTMENTS_CREATE: buildPermissionKey(SCREENS.STOCK_ADJUSTMENTS, ACTIONS.CREATE),
  STOCK_ADJUSTMENTS_UPDATE: buildPermissionKey(SCREENS.STOCK_ADJUSTMENTS, ACTIONS.UPDATE),
  STOCK_ADJUSTMENTS_DELETE: buildPermissionKey(SCREENS.STOCK_ADJUSTMENTS, ACTIONS.DELETE),
  STOCK_ADJUSTMENTS_EXPORT: buildPermissionKey(SCREENS.STOCK_ADJUSTMENTS, ACTIONS.EXPORT),
  
  // Stock Compare
  STOCK_COMPARE_VIEW: buildPermissionKey(SCREENS.STOCK_COMPARE, ACTIONS.VIEW),
  STOCK_COMPARE_CREATE: buildPermissionKey(SCREENS.STOCK_COMPARE, ACTIONS.CREATE),
  STOCK_COMPARE_UPDATE: buildPermissionKey(SCREENS.STOCK_COMPARE, ACTIONS.UPDATE),
  STOCK_COMPARE_DELETE: buildPermissionKey(SCREENS.STOCK_COMPARE, ACTIONS.DELETE),
  STOCK_COMPARE_EXPORT: buildPermissionKey(SCREENS.STOCK_COMPARE, ACTIONS.EXPORT),
} as const;

// Type for all permission keys
export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Helper to get all permissions for a screen
export function getScreenPermissions(screen: string): PermissionKey[] {
  return Object.values(PERMISSIONS).filter((key) => key.startsWith(`screen:${screen}:`)) as PermissionKey[];
}
```

#### Step 2: Create Type-Safe Guard Functions
**File:** `src/lib/access/guards.ts` (Update existing)

```typescript
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/constants";

export type AccessGuards = {
  has: (k: PermissionKey | string) => boolean;
  canView: (screen: string) => boolean;
  canCreate: (screen: string) => boolean;
  canUpdate: (screen: string) => boolean;
  canDelete: (screen: string) => boolean;
  canExport: (screen: string) => boolean;
  inWarehouse: (code?: string | null) => boolean;
  
  // Type-safe helpers
  canViewTallyCards: () => boolean;
  canCreateTallyCards: () => boolean;
  // ... etc
};

export function buildGuards(s: SessionContext): AccessGuards {
  // ... existing implementation ...
  
  return {
    // ... existing guards ...
    
    // Type-safe screen-specific helpers
    canViewTallyCards: () => has(PERMISSIONS.TALLY_CARDS_VIEW),
    canCreateTallyCards: () => has(PERMISSIONS.TALLY_CARDS_CREATE),
    // Add more as needed
  };
}
```

#### Step 3: Update Sidebar Items to Use Constants
**File:** `src/navigation/sidebar/sidebar-items.ts`

```typescript
import { PERMISSIONS } from "@/lib/permissions/constants";

export const sidebarItems: NavGroup[] = [
  {
    id: 4,
    label: "Tally Card Manager",
    items: [
      {
        title: "Tally Cards",
        url: "/forms/tally-cards",
        icon: Grid2x2,
        requiredAny: [PERMISSIONS.TALLY_CARDS_VIEW], // ✅ Type-safe
      },
      {
        title: "Stock Adjustments",
        url: "/forms/stock-adjustments",
        icon: ArrowLeftRight,
        requiredAny: [PERMISSIONS.STOCK_ADJUSTMENTS_VIEW], // ✅ Type-safe
      },
      // ... etc
    ],
  },
];
```

#### Step 4: Add TypeScript Validation Script
**File:** `scripts/validate-permissions.ts`

```typescript
/**
 * Script to validate that all permission keys in codebase match database
 * Run: tsx scripts/validate-permissions.ts
 */

import { PERMISSIONS } from "../src/lib/permissions/constants";
import { supabaseServer } from "../src/lib/supabase-server";

async function validatePermissions() {
  const supabase = await supabaseServer();
  
  // Fetch all permissions from database
  const { data: dbPermissions } = await supabase
    .from("permissions")
    .select("key");
  
  const codePermissions = Object.values(PERMISSIONS);
  const dbPermissionKeys = dbPermissions?.map((p) => p.key) ?? [];
  
  // Find mismatches
  const missingInDb = codePermissions.filter((p) => !dbPermissionKeys.includes(p));
  const missingInCode = dbPermissionKeys.filter((p) => !codePermissions.includes(p));
  
  if (missingInDb.length > 0) {
    console.error("❌ Permissions in code but not in database:", missingInDb);
  }
  
  if (missingInCode.length > 0) {
    console.warn("⚠️ Permissions in database but not in code:", missingInCode);
  }
  
  if (missingInDb.length === 0 && missingInCode.length === 0) {
    console.log("✅ All permissions are in sync!");
  }
}

validatePermissions();
```

### Testing Checklist
- [ ] Verify TypeScript catches typos in permission keys
- [ ] Test autocomplete in IDE for permission constants
- [ ] Run validation script to check sync with database
- [ ] Verify all existing permission strings are migrated
- [ ] Test that guards work with new constants

---

## 4. Analytics to Track Permission-Related Errors

### Overview
Add analytics tracking to monitor permission-related errors, failed access attempts, and permission fetch failures. This helps identify issues and improve security.

### Implementation Plan

#### Step 1: Create Analytics Service
**File:** `src/lib/analytics/permissions-analytics.ts`

```typescript
/**
 * Analytics service for tracking permission-related events
 */

type PermissionEvent = 
  | { type: "permission_fetch_failed"; error: string; userId?: string }
  | { type: "access_denied"; screen: string; action: string; userId: string }
  | { type: "permission_refresh"; userId: string; success: boolean }
  | { type: "warehouse_access_denied"; warehouseCode: string; userId: string }
  | { type: "route_protection_triggered"; route: string; userId: string };

export function trackPermissionEvent(event: PermissionEvent) {
  // Option 1: Send to your analytics service (e.g., PostHog, Mixpanel, etc.)
  if (typeof window !== "undefined" && (window as any).analytics) {
    (window as any).analytics.track("permission_event", event);
  }
  
  // Option 2: Send to your backend API
  fetch("/api/analytics/permissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch((err) => {
    console.error("Failed to track permission event:", err);
  });
  
  // Option 3: Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Permission Analytics]", event);
  }
}
```

#### Step 2: Create Analytics API Endpoint
**File:** `src/app/api/analytics/permissions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Store in analytics table (create this table in database)
    const { error } = await supabase.from("permission_analytics").insert({
      user_id: user.id,
      event_type: event.type,
      event_data: event,
      created_at: new Date().toISOString(),
    });
    
    if (error) {
      console.error("Failed to store analytics event:", error);
      return NextResponse.json({ error: "Failed to store event" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

#### Step 3: Integrate into Route Guards
**File:** `src/lib/access/route-guards.ts` (Update existing)

```typescript
import { trackPermissionEvent } from "@/lib/analytics/permissions-analytics";

export async function protectRoute(screenSlug: string, warehouseCode?: string | null) {
  const guards = await getGuards();
  
  // Get user ID for analytics
  const session = await getSessionContext();
  const userId = session.userId;

  if (!guards.canView(screenSlug)) {
    trackPermissionEvent({
      type: "access_denied",
      screen: screenSlug,
      action: "view",
      userId,
    });
    
    console.warn(`[RouteGuard] Access denied: User cannot view screen "${screenSlug}"`);
    redirect("/");
  }

  if (warehouseCode && !guards.inWarehouse(warehouseCode)) {
    trackPermissionEvent({
      type: "warehouse_access_denied",
      warehouseCode,
      userId,
    });
    
    console.warn(`[RouteGuard] Access denied: User cannot access warehouse "${warehouseCode}"`);
    redirect("/");
  }
}
```

#### Step 4: Integrate into Permission Context
**File:** `src/contexts/permissions-context.tsx` (Update from Enhancement #1)

```typescript
import { trackPermissionEvent } from "@/lib/analytics/permissions-analytics";

export function PermissionsProvider({ children, initialPermissions = [] }) {
  // ... existing code ...
  
  const refresh = useCallback(async () => {
    try {
      await mutate();
      trackPermissionEvent({
        type: "permission_refresh",
        userId: session?.userId ?? "unknown",
        success: true,
      });
    } catch (error) {
      trackPermissionEvent({
        type: "permission_refresh",
        userId: session?.userId ?? "unknown",
        success: false,
      });
      throw error;
    }
  }, [mutate]);
  
  // Track fetch errors
  useEffect(() => {
    if (error) {
      trackPermissionEvent({
        type: "permission_fetch_failed",
        error: error.message,
        userId: session?.userId,
      });
    }
  }, [error]);
  
  // ... rest of component
}
```

#### Step 5: Create Analytics Dashboard Query
**File:** `src/app/(main)/admin/analytics/permissions/page.tsx`

```typescript
/**
 * Admin dashboard to view permission analytics
 * Shows:
 * - Failed access attempts
 * - Permission fetch failures
 * - Most denied screens
 * - Warehouse access issues
 */

export default async function PermissionAnalyticsPage() {
  // Query permission_analytics table
  // Display charts and tables
  // ... implementation
}
```

### Database Schema
**Migration:** `supabase/migrations/XXXX_create_permission_analytics.sql`

```sql
CREATE TABLE permission_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permission_analytics_user_id ON permission_analytics(user_id);
CREATE INDEX idx_permission_analytics_event_type ON permission_analytics(event_type);
CREATE INDEX idx_permission_analytics_created_at ON permission_analytics(created_at);
```

### Testing Checklist
- [ ] Verify events are tracked when access is denied
- [ ] Test analytics endpoint with valid/invalid data
- [ ] Verify events are stored in database
- [ ] Test analytics dashboard displays data correctly
- [ ] Verify no PII is logged in events
- [ ] Test with high volume of events (performance)

---

## Implementation Priority

1. **Permission Constants/Enum** (High Priority)
   - Prevents bugs from typos
   - Improves developer experience
   - Low risk, high value

2. **Loading State for Permission Fetch** (Medium Priority)
   - Improves UX
   - Helps debug issues
   - Medium effort

3. **Permission Invalidation/Refresh** (Medium Priority)
   - Important for admin workflows
   - Requires WebSocket/SSE setup
   - Medium-high effort

4. **Analytics Tracking** (Low Priority)
   - Nice to have for monitoring
   - Requires database schema changes
   - Can be added incrementally

---

## Notes

- All enhancements can be implemented independently
- Each enhancement includes backward compatibility
- Test thoroughly before deploying to production
- Consider feature flags for gradual rollout
- Document any breaking changes in CHANGELOG.md











