# Forms Architecture Guide

## What we’re building (philosophy)
- Every **form screen** is composed of small, re-usable **sections** (Order Details, Add Item, Items Table, etc.).
- A single, screen-specific **hook** is the *brain* for that form: it owns UI state, orchestrates data calls, and exposes a tidy API to sections.
- Form UIs use **ShadCN** components + Tailwind, and keep validation and side effects out of JSX as much as possible.
- Data comes through a **provider seam** (mock now; Supabase/IMS later) so the UI never depends on where the data lives.

---

## Folder layout (forms only)

src/
app/(main)/forms/<feature>/
page.tsx # Thin server wrapper
<feature>-form.tsx # Composes sections; instantiates the hook once
sections/
<section-a>.tsx
<section-b>.tsx
...
hooks/
use-<feature>-form.ts # Screen “brain”: state + calls provider
types.ts # UI-facing, screen-level types (shape the hook returns)

lib/
data/
types.ts # Canonical domain types shared by all forms
provider.ts # DataProvider interface (contract)
index.ts # Picks current provider
providers/
mock.ts # Mock implementation (imports JSON, maps -> canonical)
supabase.ts # Supabase implementation (later)
ims.ts # IMS API implementation (later)

data/mock/ # JSON datasets used by mock provider
items.json
customers.json
sites.json
...

markdown
Copy code

> If a form has lots of sections, put them under `sections/`. Keep screen-specific stuff inside the feature folder.

---

## What each file does (and doesn’t)

### `page.tsx` (server component)
**Purpose:** lightweight entry point. No logic. Just renders the form component.  
**Do:** keep it tiny.  
**Don’t:** fetch data here for the client form; let the hook/provider handle it.

### `<feature>-form.tsx` (composition)
**Purpose:** layout + composing sections; create the form **hook once** and pass it down.  
**Do:** render sections, pass `form` prop to each section, keep visual shell (header, tabs).  
**Don’t:** keep state here (except local UI toggles that aren’t reusable). Don’t fetch data here.

### `sections/<section>.tsx` (presentational)
**Purpose:** render a slice of the form; strictly UI + event handlers using the `form` API.  
**Do:** read/write values via the `form` prop (`form.project`, `form.setProject`, etc.).  
**Don’t:** import providers or fetch data; don’t own shared state.

### `hooks/use-<feature>-form.ts`
**Purpose:** the *brain* for the screen. Owns UI state, orchestrates data calls, exposes helpers.  
**Do:**  
- Keep all form values and setters here (e.g., `project`, `warehouse`, `items`, `selectedItems`).  
- Call `dataProvider.*` to hydrate (batch with `Promise.all`).  
- Provide helpers (`calculateTotal`, `toggleAllItems`, etc.).  
**Don’t:** talk directly to Supabase/IMS; always go through `dataProvider`. Don’t put JSX here.

### `types.ts` (screen-level)
**Purpose:** UI-facing TypeScript types for what the hook returns (e.g., `RequisitionFormState`).  
**Do:** define the surface that sections rely on; makes refactors predictable.  
**Don’t:** duplicate domain types here (put domain shapes in `lib/data/types.ts`).

### `lib/data/*` (data provider seam)
- `types.ts` — **canonical domain types** (Item, Requisition, Warehouse/Site, Customer…). This is what the UI expects across *any* backend.
- `provider.ts` — **DataProvider contract** (`listItems`, `getRequisition`, `listSites`, `listCustomers`, …).
- `providers/mock.ts` — **mock data** implementation:
  - Imports JSON from `src/data/mock/*.json`.
  - Maps raw columns (e.g., Excel headers) → canonical types.
  - Adds pagination/filter/sort/dedupe.
- `providers/supabase.ts` / `providers/ims.ts` — stubs for *real* data later.
- `index.ts` — selects the current provider (mock now; flip a flag later).

**Do:** evolve the provider methods as needed (add `getItemByNumber`, etc.).  
**Don’t:** import providers in components/sections; always go through `dataProvider`.

### `data/mock/*.json`
**Purpose:** realistic datasets (mirroring API responses) so the app behaves like production.  
**Do:** keep full datasets to test pagination; column names should reflect real exports.  
**Don’t:** use CSV/Excel directly in the client; the mock provider should import JSON.

---

## How a form works at runtime (data flow)
1. `<feature>-form.tsx` calls `const form = use<Feature>Form()`.  
2. The hook loads initial data via `dataProvider` (e.g., `listSites`, `listCustomers`, `listItems`) and sets defaults.  
3. Sections render from `form` values and call setters; heavy/optional fetches are done on demand (e.g., `getItemByNumber` when user enters an Item Number).  
4. Validation (if enabled) lives in the hook (with `react-hook-form` + `zod`) and errors are shown by the sections.

---

## Current conventions (what we should do)

- **One hook per form screen**, own all the state needed for that screen.
- **DataProvider is the only data entry** to the form. No direct backend calls in UI.
- **Map upstream columns → canonical types once** (in the provider). The UI never sees messy column names.
- **Dropdown sources**  
  - Warehouse ← **Sites** (display: `"Warehouse"` from `sites.json`, sorted A→Z, deduped as needed).  
  - Project ← **Customers** (display: `"Project Number"` from `customers.json`, sorted A→Z, deduped as needed).
- **Pagination & filtering** are part of provider methods (`{ page, pageSize, q }`).
- **Performance first**: Batch initial loads with `Promise.all`; avoid multiple renders; keep page sizes moderate (50–100).
- **No `fs`/`path` in client bundles**. Use ESM JSON imports (or dynamic imports) for mock data.
- **Styling:** ShadCN + Tailwind; keep visual patterns consistent (cards/headers/inputs).
- **(Optional) Validation:** `react-hook-form` + `zod` (start with a few critical fields; expand later).

---

## Anti-patterns (what we shouldn’t do)

- Don’t fetch data in sections or components (keeps things testable and swappable).
- Don’t cast raw JSON straight to canonical types (`as Requisition[]`) — always map.
- Don’t spread vendor logic (Supabase/IMS) into hooks/components — keep it in providers.
- Don’t make the hook return different shapes per source — UI should be source-agnostic.
- Don’t import huge JSON eagerly if not used — prefer dynamic imports (see “Perf” below).

---

## Performance guidelines (data)

- **Batch** initial requests: `Promise.all([listSites(), listCustomers(), listItems({page:1})])`.
- **Dynamic-import** big JSONs in the mock provider:
  ```ts
  const { default: items } = await import("@/data/mock/items.json");
Cache within the provider (simple in-memory map) or use SWR/React Query in the hook for repeated calls.

Debounce user search inputs before calling listItems({ q }).

Virtualize tables if rendering > 500 rows at once (or keep paging).

Stable IDs: prefer real ids from data; avoid generating new ones that break selection state.

Adding a new form (checklist)
Scaffold

src/app/(main)/forms/<feature>/page.tsx

src/app/(main)/forms/<feature>/<feature>-form.tsx

src/app/(main)/forms/<feature>/sections/...

src/app/(main)/forms/<feature>/hooks/use-<feature>-form.ts

src/app/(main)/forms/<feature>/types.ts

Hook

Define screen state + API in types.ts.

Implement use-<feature>-form.ts:

Load initial data with dataProvider (batch).

Expose values/setters/helpers.

Provider

If a dataset is new, update lib/data/types.ts and provider.ts.

Add mapping in providers/mock.ts and corresponding list/get methods.

Sections

Pure UI that consumes form. No data fetches inside sections.

Wire & test

Confirm dropdowns show correct fields, sorted/deduped.

Verify paging/filtering and perf.

Extending to real data (Supabase/IMS)
Implement supabase.ts/ims.ts with the same method names and map API → canonical types.

Flip the provider in lib/data/index.ts. UI stays unchanged.

For production: prefer server routes (Next.js Route Handlers / Server Actions) for auth, secrets, and HTTP caching; the provider can then call those endpoints.

Quick FAQ
Q: Where should we put complex joins (e.g., Requisition → Items)?
A: In the provider (or server route). Return ready-to-render canonical objects.

Q: Can sections have local state?
A: Tiny UI-only toggles are fine, but anything shared or business-logic-y should live in the hook.

Q: How do we handle inconsistent columns from exports?
A: Normalize in the mock provider’s mappers; the rest of the app never sees those headers.