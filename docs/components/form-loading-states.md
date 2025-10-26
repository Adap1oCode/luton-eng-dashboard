# Form Loading States

This document describes the comprehensive loading state system for forms in the application.

## Overview

The form loading system provides visual feedback for all loading touch points in forms, including:
- Initial form loading (edit forms)
- Form submission
- Field option loading
- Auto-save operations
- Real-time validation

## Architecture

### Components

#### 1. FormShellWithLoading
A client component wrapper for `FormShell` that handles page-level loading states.

**Props:**
```typescript
interface FormShellWithLoadingProps extends FormShellProps {
  // Initial loading (for edit forms loading existing data)
  isInitialLoading?: boolean;
  initialLoadingTitle?: string;
  initialLoadingDescription?: string;
  
  // Submission loading (for form submission)
  isSubmitting?: boolean;
  submissionTitle?: string;
  submissionDescription?: string;
  
  // Background operations (auto-save, validation, etc.)
  isBackgroundLoading?: boolean;
  backgroundLoadingMessage?: string;
  backgroundLoadingPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}
```

#### 2. Enhanced FormIsland
The `FormIsland` component has been enhanced with loading props for form-level operations.

**New Props:**
```typescript
interface FormIslandLoadingProps {
  // Field loading
  isFieldLoading?: boolean;
  fieldLoadingMessage?: string;
  
  // Auto-save
  isAutoSaving?: boolean;
  autoSaveMessage?: string;
  
  // Validation
  isValidating?: boolean;
  validationMessage?: string;
}
```

#### 3. Enhanced ResourceFormSSRPage
The generic form wrapper has been updated to support loading states.

**New Props:**
```typescript
interface ResourceFormSSRPageLoadingProps {
  // Loading props
  isInitialLoading?: boolean;
  initialLoadingTitle?: string;
  initialLoadingDescription?: string;
  submissionTitle?: string;
  submissionDescription?: string;
  isBackgroundLoading?: boolean;
  backgroundLoadingMessage?: string;
}
```

## Loading Types

### 1. FullScreenLoader
Used for blocking operations that prevent user interaction:
- Initial form loading (edit forms)
- Form submission

**Characteristics:**
- Full-screen overlay with backdrop blur
- Centered spinner with title and description
- Prevents user interaction
- Size: `sm` for submission, `md` for initial loading

### 2. BackgroundLoader
Used for non-blocking operations:
- Field option loading
- Auto-save operations
- Real-time validation

**Characteristics:**
- Small, positioned overlay
- Minimal visual footprint
- Doesn't block user interaction
- Configurable position and size

## Usage Examples

### Create Form (New)
```typescript
// new/page.tsx
export default async function NewStockAdjustmentPage() {
  return (
    <FormShellWithLoading
      title="New Stock Adjustment"
      headerTitle="Create Stock Adjustment"
      headerDescription="Add a new stock adjustment record"
      // No initial loading needed for create forms
      isInitialLoading={false}
      submissionTitle="Creating Stock Adjustment"
      submissionDescription="Please wait while we save your changes..."
    >
      <FormIsland
        formId="stock-adjustment-form"
        config={transportConfig}
        defaults={defaults}
        options={options}
        
        // Field loading for dynamic options
        isFieldLoading={isLoadingOptions}
        fieldLoadingMessage="Loading warehouse options..."
        
        // Auto-save for drafts
        isAutoSaving={isAutoSaving}
        autoSaveMessage="Saving draft..."
      />
    </FormShellWithLoading>
  );
}
```

### Edit Form (Existing)
```typescript
// [id]/edit/page.tsx
export default async function EditStockAdjustmentPage({ params }) {
  return (
    <ResourceFormSSRPage
      title="Edit Stock Adjustment"
      headerDescription="Update stock adjustment details"
      formId="stock-adjustment-form"
      config={transportConfig}
      defaults={prep.defaults ?? {}}
      options={prep.options ?? {}}
      
      // Loading props for edit forms
      isInitialLoading={false} // Data is loaded server-side
      submissionTitle="Updating Stock Adjustment"
      submissionDescription="Please wait while we save your changes..."
    />
  );
}
```

### React Query Integration
```typescript
// Form with React Query
export function FormWithLoading() {
  const { data: formData, isLoading: isInitialLoading } = useQuery({
    queryKey: ['form-data', id],
    queryFn: () => fetchFormData(id),
  });
  
  const { data: fieldOptions, isLoading: isFieldLoading } = useQuery({
    queryKey: ['field-options'],
    queryFn: () => fetchFieldOptions(),
  });
  
  const submitMutation = useMutation({
    mutationFn: submitForm,
    onSuccess: () => router.push('/success'),
  });
  
  return (
    <FormShellWithLoading
      isInitialLoading={isInitialLoading}
      initialLoadingTitle="Loading Form"
    >
      <FormIsland
        isFieldLoading={isFieldLoading}
        fieldLoadingMessage="Loading options..."
        isSubmitting={submitMutation.isPending}
        submissionTitle="Saving Changes"
      />
    </FormShellWithLoading>
  );
}
```

## Loading State Management

### Server-Side Loading
For edit forms, data is typically loaded server-side, so no initial loading is needed:
```typescript
// Server component loads data
const prep = await getRecordForEdit(config, resourceKey, id);

// Pass to client component
<ResourceFormSSRPage
  defaults={prep.defaults ?? {}}
  options={prep.options ?? {}}
  isInitialLoading={false} // No loading needed
/>
```

### Client-Side Loading
For dynamic operations, use React Query or similar:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['form-data'],
  queryFn: fetchFormData,
});

<FormShellWithLoading
  isInitialLoading={isLoading}
  initialLoadingTitle="Loading Form Data"
>
  {/* Form content */}
</FormShellWithLoading>
```

## Best Practices

### 1. Loading Message Guidelines
- **Initial Loading**: "Loading [Resource Name]" or "Loading Form"
- **Submission**: "Creating/Updating [Resource Name]" or "Saving Changes"
- **Field Loading**: "Loading [Field Type] options..." (e.g., "Loading warehouse options...")
- **Auto-save**: "Saving draft..." or "Auto-saving..."
- **Validation**: "Validating..." or "Checking..."

### 2. Loading State Hierarchy
1. **FullScreenLoader** for blocking operations
2. **BackgroundLoader** for non-blocking operations
3. **Inline loaders** for individual field loading (future enhancement)

### 3. Performance Considerations
- Use `isInitialLoading={false}` for server-side loaded data
- Prefer `BackgroundLoader` for frequent operations
- Use appropriate loader sizes (`sm`, `md`, `lg`)

### 4. Accessibility
- All loaders include proper ARIA attributes
- Loading states are announced to screen readers
- Keyboard navigation remains functional

## Migration Guide

### From Basic Forms
1. Replace `FormShell` with `FormShellWithLoading`
2. Add loading props as needed
3. Update form pages to use new loading props

### From Custom Loading
1. Remove custom loading implementations
2. Use the standardized loading components
3. Update loading messages to follow guidelines

## Testing

### Unit Tests
- Component rendering with loading states
- Loading prop validation
- Default value handling

### Integration Tests
- Form submission with loading states
- Loading state transitions
- Error handling with loading states

### E2E Tests
- User interaction during loading
- Loading state accessibility
- Mobile responsiveness

## Future Enhancements

### Phase 3: Enhanced DynamicField
- Individual field loading states
- Inline loading indicators
- Field-specific loading messages

### Phase 4: Advanced Loading
- Progress indicators for long operations
- Skeleton loading for form fields
- Optimistic updates with loading states

### Phase 5: Performance Optimization
- Lazy loading for form sections
- Preloading for common operations
- Caching strategies for loading states
