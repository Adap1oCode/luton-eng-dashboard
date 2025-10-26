# Enhanced Loaders Example

This document provides a concrete example of how to integrate the enhanced loaders into a typical resource list page.

## Example: Users Page with Enhanced Loaders

### Before: Basic Implementation

```typescript
// src/app/(main)/forms/users/page.tsx
import React from "react";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const initialData = await fetchUsers();
  
  return (
    <UsersClient initialData={initialData} />
  );
}
```

```typescript
// src/app/(main)/forms/users/users-client.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import PageShell from "@/components/forms/shell/page-shell";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

export function UsersClient({ initialData }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => fetchUsers({ page, pageSize }),
    initialData,
  });

  if (error) {
    return <div>Error loading users</div>;
  }

  return (
    <PageShell
      title="Users"
      count={data?.total || 0}
    >
      <ResourceTableClient
        config={usersViewConfig}
        initialRows={data?.rows || []}
        initialTotal={data?.total || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </PageShell>
  );
}
```

### After: Enhanced with Loading States

```typescript
// src/app/(main)/forms/users/page.tsx
import React from "react";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const initialData = await fetchUsers();
  
  return (
    <UsersClient initialData={initialData} />
  );
}
```

```typescript
// src/app/(main)/forms/users/users-client.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import PageShellWithLoading from "@/components/forms/shell/page-shell-with-loading";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import { FullScreenLoader } from "@/components/ui/enhanced-loader";
import { BackgroundLoader } from "@/components/ui/background-loader";

export function UsersClient({ initialData }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => fetchUsers({ page, pageSize }),
    initialData,
    staleTime: 30000, // 30 seconds
    retry: 3,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Users
          </h2>
          <p className="text-gray-600 mb-4">
            {error.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageShellWithLoading
        title="Users"
        count={data?.total || 0}
        toolbarConfig={usersToolbar}
        toolbarActions={usersActions}
        enableAdvancedFilters={true}
        
        // Loading props
        isLoading={isLoading && !data}
        loadingTitle="Loading Users"
        loadingDescription="Fetching user data..."
        
        isRefetching={isFetching && data}
        refetchMessage="Updating user list..."
        refetchPosition="top-right"
      >
        <ResourceTableClient
          config={usersViewConfig}
          initialRows={data?.rows || []}
          initialTotal={data?.total || 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          
          // Enhanced loading props
          isLoading={isLoading && !data}
          loadingTitle="Loading Users"
          loadingDescription="Fetching user data..."
          
          isRefetching={isFetching && data}
          refetchMessage="Updating..."
          refetchPosition="top-right"
        />
      </PageShellWithLoading>
    </>
  );
}
```

## Key Improvements

### 1. Enhanced User Experience
- **Initial Loading**: Users see a professional loading screen instead of a blank page
- **Background Updates**: Users get feedback when data is being refreshed
- **Error Handling**: Clear error messages with retry functionality
- **Consistent Branding**: All loaders use the same visual style

### 2. Performance Optimizations
- **React Query Integration**: Intelligent caching and background updates
- **Stale Time**: Reduces unnecessary API calls
- **Retry Logic**: Automatic retry on network failures
- **Optimistic Updates**: Immediate feedback for user actions

### 3. Accessibility Improvements
- **Screen Reader Support**: Loading states are announced
- **Keyboard Navigation**: All interactions remain accessible
- **High Contrast**: Loaders work in all color schemes
- **Focus Management**: Proper focus handling during loading

## Configuration Examples

### Custom Loading Messages

```typescript
// Different contexts, different messages
<PageShellWithLoading
  title="Users"
  isLoading={isLoading}
  loadingTitle="Loading User Directory"
  loadingDescription="Fetching user information and permissions..."
  isRefetching={isRefetching}
  refetchMessage="Refreshing user data..."
/>
```

### Different Loader Positions

```typescript
// Top-right for data updates
<BackgroundLoader
  message="Updating..."
  position="top-right"
  size="md"
/>

// Bottom-right for auto-save
<BackgroundLoader
  message="Saving draft..."
  position="bottom-right"
  size="sm"
/>

// Top-center for validation
<BackgroundLoader
  message="Validating..."
  position="top-center"
  size="sm"
/>
```

### Conditional Loading States

```typescript
// Show different loaders based on context
{isInitialLoading && (
  <FullScreenLoader
    title="Loading Users"
    description="Fetching user data..."
    size="md"
  />
)}

{isRefetching && (
  <BackgroundLoader
    message="Updating user list..."
    position="top-right"
    size="md"
  />
)}

{isExporting && (
  <BackgroundLoader
    message="Exporting data..."
    position="bottom-right"
    size="sm"
  />
)}
```

## Testing the Implementation

### Unit Tests

```typescript
// tests/unit/components/forms/users/users-client.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { UsersClient } from '@/app/(main)/forms/users/users-client';

describe('UsersClient', () => {
  it('shows loading state initially', () => {
    render(<UsersClient initialData={null} />);
    
    expect(screen.getByText('Loading Users')).toBeInTheDocument();
    expect(screen.getByText('Fetching user data...')).toBeInTheDocument();
  });

  it('shows background loader when refetching', async () => {
    const { rerender } = render(<UsersClient initialData={mockData} />);
    
    // Simulate refetch
    rerender(<UsersClient initialData={mockData} isRefetching={true} />);
    
    expect(screen.getByText('Updating user list...')).toBeInTheDocument();
  });

  it('handles errors gracefully', () => {
    render(<UsersClient initialData={null} error={new Error('Network error')} />);
    
    expect(screen.getByText('Error Loading Users')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// tests/integration/forms/users/users-loading.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Users Page Loading States', () => {
  test('shows loading state when first visiting', async ({ page }) => {
    await page.goto('/forms/users');
    
    // Should show loading state
    await expect(page.locator('text=Loading Users')).toBeVisible();
    await expect(page.locator('text=Fetching user data...')).toBeVisible();
    
    // Should show content after loading
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Loading Users')).not.toBeVisible();
  });

  test('shows background loader when refreshing data', async ({ page }) => {
    await page.goto('/forms/users');
    await page.waitForLoadState('networkidle');
    
    // Trigger refresh
    await page.click('button[aria-label="Refresh"]');
    
    // Should show background loader
    await expect(page.locator('text=Updating user list...')).toBeVisible();
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/users', route => route.abort());
    
    await page.goto('/forms/users');
    
    // Should show error state
    await expect(page.locator('text=Error Loading Users')).toBeVisible();
    await expect(page.locator('text=Retry')).toBeVisible();
  });
});
```

## Performance Monitoring

### Metrics to Track

```typescript
// Monitor loading performance
const performanceMetrics = {
  initialLoadTime: 0,
  refetchTime: 0,
  errorRate: 0,
  userSatisfaction: 0,
};

// Track loading times
const startTime = performance.now();
// ... loading operation
const endTime = performance.now();
performanceMetrics.initialLoadTime = endTime - startTime;
```

### Performance Budgets

```typescript
// Set performance budgets
const PERFORMANCE_BUDGETS = {
  INITIAL_LOAD_TIME: 1000,    // 1 second
  REFETCH_TIME: 500,          // 500ms
  ERROR_RATE: 0.01,           // 1%
  USER_SATISFACTION: 0.9,     // 90%
};
```

## Migration Checklist

- [ ] Replace `PageShell` with `PageShellWithLoading`
- [ ] Add loading props to component
- [ ] Update error handling
- [ ] Add React Query integration
- [ ] Update tests
- [ ] Monitor performance metrics
- [ ] Test accessibility
- [ ] Verify mobile responsiveness

## Benefits Achieved

1. **Better User Experience**: Professional loading states instead of blank pages
2. **Improved Performance**: Intelligent caching and background updates
3. **Enhanced Accessibility**: Screen reader support and keyboard navigation
4. **Consistent Branding**: Unified loading experience across the application
5. **Better Error Handling**: Clear error messages with retry functionality
6. **Mobile Optimized**: Responsive loaders that work on all devices

This example demonstrates how the enhanced loaders can transform a basic resource list page into a professional, performant, and accessible user interface.
