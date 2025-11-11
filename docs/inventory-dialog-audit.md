# Inventory Dialog Audit

## Flow Walkthrough
- `ItemNumberCell` renders the item number button and calls the injected `handleItemNumberClick`.
- `useInventoryDialog` manages dialog state and selected item number; the same hook is reused on each table screen.
- `InventoryInfoDialog` (at `src/components/inventory/inventory-info-dialog.tsx`) opens, fetches `/api/inventory-current?filters[...]` for the selected item number, and renders the result.

## Stock Adjustments Styling Reference

- Stock Adjustments creates/edit screens use `FormShell` + `SectionCard` layout, which provides a bounded surface (`rounded-xl border bg-card text-card-foreground shadow`) with consistent `p-6` padding and header typography (`font-semibold leading-none`).
- Individual inputs come from shared shadcn primitives (`Input`, `Textarea`, `Select`); each field wrapper is a `flex flex-col gap-3` stack with a 14px label (`text-sm font-medium leading-none`) and a control using the standard form heights (`h-9` for inputs/combos, `min-h-28` for textareas).
- Responsive behavior is handled by config-driven grids (`grid gap-4 @md:grid-cols-2 @xl:grid-cols-3`), collapsing to a single column on mobile and expanding up to three columns on large breakpoints without custom media queries.
- Action buttons lean on tweakcn button variants (e.g., `inline-flex items-center gap-2 h-8 rounded-md px-3 text-xs`) with variant props instead of bespoke class strings; only the primary submit aligns to resource-specific color tokens when needed.
- Validation and helper text rely on shared `FormMessage` styles—no bespoke red borders; errors present beneath the control using the standardized `text-sm text-destructive` pattern.
- Section-level toggles (e.g., multi-location) are injected via `headerRight` slots, keeping individual field stacks clean and focused on label/control pairs.

## Findings (Ordered by Severity)

### 1. Missing Shadcn/Radix Dialog Shell
- The component builds its own overlay (`<div className="fixed inset-0 ...">`) and close button.
- It duplicates click-outside handling with a document-level listener.
- Diverges from the shared Shadcn-based dialog (`src/components/ui/dialog.tsx`), making it harder to inherit accessibility, theming, and animation fixes.

### 2. Hard-Coded, Non-Configurable Layout
- `InventoryData` interface and the JSX layout are fixed to a handful of fields (item number, description, category, etc.).
- No configuration hook-up, so adding/removing fields requires editing the component itself.
- Lacks "build once" reusability: we can’t easily reuse the shell for other resource dialogs.

### 3. Component Placement Implies Resource-Specific Code
- Lives in `src/components/inventory`, so it reads like a one-off feature rather than a shared pattern.
- For a generic “inventory details” dialog, move it under a dialog shell namespace (e.g., `src/components/dialogs/`) with configuration split out.

### 4. Fetch Layer Bypasses Existing Clients
- Directly uses `fetch` with query-string manipulation and `raw=true`.
- No integration with shared data helpers (`fetchResourcePage`, React Query, etc.), so there’s no caching, dedupe, or error normalization.
- Fetch runs every open, even for the same item, and there’s no abort logic when the dialog closes mid-flight.

### 5. Not Clearly Shadcn/Tweakcn Compliant
- Close button is a raw `✕`; no shared icon button styling.
- Typography, spacing, and colors are hand-tuned; future design tokens or theme adjustments won’t propagate automatically.

### 6. Performance & UX Gaps
- Every open triggers a network request; nothing caches or reuses already loaded row data.
- A slow request keeps the dialog empty until data arrives; we could show skeletons or reuse data passed from the table row.
- Closing the dialog doesn’t cancel the request; the promise resolves and sets state even after the user moves on.

## Improvement Recommendations

1. **Adopt the Shared Dialog Shell**
   - Wrap the content with `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, etc., from `src/components/ui/dialog.tsx`.
   - Drop the manual overlay and click-outside listener—Radix handles accessibility and focus lock for us.

2. **Separate Shell from Content Configuration**
   - Create a generic dialog shell (e.g., `src/components/dialogs/data-dialog.tsx`) that accepts field config, fetcher, and layout metadata.
   - Move inventory-specific field definitions to a config file (e.g., `src/components/dialogs/configs/inventory-info.config.ts`) so other screens can reuse the shell.

3. **Reuse Existing Data-Fetch Utilities**
   - Use `fetchResourcePage` (SSR) or build a small client fetch helper that mirrors our list APIs instead of composing query strings manually.
   - Consider React Query for caching stale data between opens.

4. **Improve Performance**
   - Accept initial row data when available to avoid refetching everything we already have.
   - Add an abort controller or `useEffect` cleanup so closing the dialog cancels pending fetches.
   - Show skeleton placeholders instead of a blank card while loading.

5. **Enhance UX Polish**
   - Replace the `✕` character with the shared close button and consistent iconography.
   - Leverage existing badge/surface components for status values to keep styling consistent.

6. **Future-Proof the Component**
   - Ensure field definitions are declarative (label, value accessor, formatter) instead of hardcoded JSX.
   - Allow injection of additional sections or controls so other teams can extend the dialog without editing the core component.

Addressing these points will align the dialog with the “build once, use many” principle, keep it compliant with our Shadcn/Tweakcn patterns, and improve performance and maintainability.
