# Enhanced Loaders

This document describes the enhanced loader components that provide visual feedback for all loading states in the application.

## Overview

The enhanced loader system provides visual feedback for all loading touch points, including:
- Initial page loading
- Data fetching and refetching
- Form submission
- Background operations
- Field loading

## Components

### FullScreenLoader

A large, centered overlay for initial loading or blocking operations.

**Props:**
```typescript
interface FullScreenLoaderProps {
  title?: string;           // Default: "Loading..."
  description?: string;     // Default: "Please wait..."
  size?: "sm" | "md" | "lg"; // Default: "md"
  showProgressDots?: boolean; // Default: true
  className?: string;
}
```

**Usage:**
```typescript
import { FullScreenLoader } from "@/components/ui/enhanced-loader";

// Basic usage
<FullScreenLoader />

// Customized
<FullScreenLoader
  title="Loading Stock Adjustments"
  description="Fetching your data..."
  size="md"
/>
```

### BackgroundLoader

A small, unobtrusive loader for background operations.

**Props:**
```typescript
interface BackgroundLoaderProps {
  message?: string;         // Default: "Updating..."
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  size?: "sm" | "md" | "lg"; // Default: "md"
  className?: string;
}
```

**Usage:**
```typescript
import { BackgroundLoader } from "@/components/ui/background-loader";

// Basic usage
<BackgroundLoader />

// Customized
<BackgroundLoader
  message="Updating..."
  position="top-right"
  size="md"
/>
```

### PageShellWithLoading

A client component wrapper for PageShell to handle page-level loading states.

**Props:**
```typescript
interface PageShellWithLoadingProps extends PageShellProps {
  isLoading?: boolean;
  loadingTitle?: string;
  loadingDescription?: string;
  isRefetching?: boolean;
  refetchMessage?: string;
  refetchPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}
```

**Usage:**
```typescript
import PageShellWithLoading from "@/components/forms/shell/page-shell-with-loading";

<PageShellWithLoading
  title="Stock Adjustments"
  isLoading={isLoading}
  loadingTitle="Loading Stock Adjustments"
  loadingDescription="Fetching your data..."
  isRefetching={isRefetching}
  refetchMessage="Updating..."
>
  {/* Page content */}
</PageShellWithLoading>
```

## Migration Guide

### From Custom Loaders

1. **Replace custom full-screen loaders:**
   ```typescript
   // Before
   {isLoading && (
     <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
       <div className="bg-white p-8 rounded-lg">
         <div className="animate-spin w-8 h-8 border-4 border-blue-600"></div>
         <p>Loading...</p>
       </div>
     </div>
   )}

   // After
   {isLoading && (
     <FullScreenLoader
       title="Loading..."
       description="Please wait..."
       size="md"
     />
   )}
   ```

2. **Replace custom background loaders:**
   ```typescript
   // Before
   {isRefetching && (
     <div className="fixed top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
       <div className="flex items-center space-x-2">
         <div className="animate-spin w-4 h-4 border-2 border-blue-600"></div>
         <span>Updating...</span>
       </div>
     </div>
   )}

   // After
   {isRefetching && (
     <BackgroundLoader
       message="Updating..."
       position="top-right"
       size="md"
     />
   )}
   ```

### From PageShell to PageShellWithLoading

1. **Update imports:**
   ```typescript
   // Before
   import PageShell from "@/components/forms/shell/page-shell";

   // After
   import PageShellWithLoading from "@/components/forms/shell/page-shell-with-loading";
   ```

2. **Add loading props:**
   ```typescript
   // Before
   <PageShell title="Stock Adjustments">
     {/* Content */}
   </PageShell>

   // After
   <PageShellWithLoading
     title="Stock Adjustments"
     isLoading={isLoading}
     loadingTitle="Loading Stock Adjustments"
     isRefetching={isRefetching}
     refetchMessage="Updating..."
   >
     {/* Content */}
   </PageShellWithLoading>
   ```

## Usage Examples

### View Screen with Loading States

```typescript
import PageShellWithLoading from "@/components/forms/shell/page-shell-with-loading";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

export function StockAdjustmentsView() {
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: fetchStockAdjustments,
  });

  return (
    <PageShellWithLoading
      title="Stock Adjustments"
      count={data?.total || 0}
      isLoading={isLoading}
      loadingTitle="Loading Stock Adjustments"
      loadingDescription="Fetching your data..."
      isRefetching={isRefetching}
      refetchMessage="Updating..."
    >
      <ResourceTableClient
        config={stockAdjustmentsViewConfig}
        initialRows={data?.rows || []}
        initialTotal={data?.total || 0}
      />
    </PageShellWithLoading>
  );
}
```

### Form with Loading States

```typescript
import FormShellWithLoading from "@/components/forms/shell/form-shell-with-loading";
import FormIsland from "@/components/forms/shell/form-island";

export function StockAdjustmentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <FormShellWithLoading
      title="New Stock Adjustment"
      headerTitle="Create Stock Adjustment"
      headerDescription="Add a new stock adjustment record"
      isSubmitting={isSubmitting}
      submissionTitle="Creating Stock Adjustment"
      submissionDescription="Please wait while we save your changes..."
    >
      <FormIsland
        formId="stock-adjustment-form"
        config={transportConfig}
        defaults={defaults}
        options={options}
      />
    </FormShellWithLoading>
  );
}
```

### Custom Loading Messages

```typescript
// Different loading messages for different contexts
<FullScreenLoader
  title="Loading User Data"
  description="Fetching user information and permissions..."
  size="lg"
/>

<BackgroundLoader
  message="Saving draft..."
  position="bottom-right"
  size="sm"
/>

<BackgroundLoader
  message="Validating form..."
  position="top-center"
  size="md"
/>
```

## Best Practices

### 1. Loading Message Guidelines
- **Initial Loading**: "Loading [Resource Name]" or "Loading [Page Name]"
- **Data Refetching**: "Updating..." or "Refreshing data..."
- **Form Submission**: "Saving..." or "Creating/Updating [Resource]"
- **Background Operations**: "Processing..." or "Saving draft..."

### 2. Loader Selection
- **FullScreenLoader**: For blocking operations that prevent user interaction
- **BackgroundLoader**: For non-blocking operations that don't interrupt user flow
- **PageShellWithLoading**: For page-level loading states

### 3. Performance Considerations
- Use appropriate loader sizes (`sm`, `md`, `lg`)
- Avoid showing loaders for very quick operations (< 200ms)
- Use `BackgroundLoader` for frequent operations
- Use `FullScreenLoader` sparingly for major operations

### 4. Accessibility
- All loaders include proper ARIA attributes
- Loading states are announced to screen readers
- Keyboard navigation remains functional
- High contrast support for all loader variants

## Testing

### Unit Tests
```typescript
import { render, screen } from '@testing-library/react';
import { FullScreenLoader } from '@/components/ui/enhanced-loader';

describe('FullScreenLoader', () => {
  it('renders with default props', () => {
    render(<FullScreenLoader />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom title and description', () => {
    render(
      <FullScreenLoader
        title="Custom Title"
        description="Custom Description"
      />
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import PageShellWithLoading from '@/components/forms/shell/page-shell-with-loading';

describe('PageShellWithLoading Integration', () => {
  it('shows loading state when isLoading is true', async () => {
    render(
      <PageShellWithLoading
        title="Test Page"
        isLoading={true}
        loadingTitle="Loading Test Page"
      >
        <div>Content</div>
      </PageShellWithLoading>
    );

    expect(screen.getByText('Loading Test Page')).toBeInTheDocument();
  });
});
```

## Future Enhancements

### Planned Features
- **Progress Indicators**: For long-running operations
- **Skeleton Loading**: For content placeholders
- **Custom Animations**: Configurable loader animations
- **Theme Support**: Dark mode and custom themes
- **Accessibility Improvements**: Enhanced screen reader support

### Performance Optimizations
- **Lazy Loading**: Load loader components only when needed
- **Animation Optimization**: GPU-accelerated animations
- **Bundle Size**: Tree-shaking for unused loader variants
- **Memory Management**: Automatic cleanup of loader instances
