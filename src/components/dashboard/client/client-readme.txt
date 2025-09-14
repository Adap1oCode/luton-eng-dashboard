# 📂 `src/components/dashboard/client/` — Client Dashboard Engine

This folder contains the **core runtime logic** for all dashboards.  
It defines how widgets behave, how data is filtered, and how user interactions (like clicking a tile) are handled.

The goal is **maximum reusability** across dashboards, with:
- No widget-specific code in this folder
- All logic shared by all dashboards
- Config-driven behavior (from `dashboard/config.ts`)

---

## 🔧 What This Folder Controls

| Area | Responsibility |
|------|----------------|
| Tile logic | Metric calculations, % trends, filters |
| Filtering | Range-based filtering, click filters |
| Actions | Making tiles or charts interactive |
| Data prep | Formatting records for visual widgets |
| Diagnostics | Debugging filters and widget behavior |

---

## 📁 Files and Their Responsibilities

### `client.tsx`

**Main dashboard runtime.**

This is the top-level renderer that:
- Iterates over `config.widgets[]`
- Instantiates the correct component for each widget (from the map)
- Passes in filtered data, calculated metrics, click handlers, etc.
- Manages global date range, sheet drawer, filters

💡 This is where all logic **comes together** for rendering dashboards.

---

### `tile-calculations.ts`

**Core logic for calculating tile values.**

This runs at runtime and:
- Applies filter / average / percentage logic
- Computes trend + direction vs previous range
- Computes percentage of total (e.g. Issued / Total Reqs)
- Attaches `.value`, `.trend`, `.percent`, `.clickFilter` etc. to tiles

Used by both `SummaryCards` and `SectionCards`.

---

### `tile-actions.ts`

**Injects interactivity into tiles.**

It adds:
- `onClick` (for full-tile clicks)
- `onClickFilter` (for filter-to-drawer clicks)

It checks:
- `tile.clickable === true`
- `tile.filter` is defined

Only tiles with valid filters + `clickable: true` will be interactive.

---

### `data-filters.ts`

**Shared filtering engine.**

This supports:
- Runtime filtering with `compileFilter()`
- Multi-filter application with `applyDataFilters()`
- Safe evaluation of AND/OR/nested filters
- Type-safe `Filter` definition used throughout dashboard

This logic powers both **click-to-filter drawer** and **date range filters**.

---

### `fast-filter.ts`

**Performance optimization checker.**

Used in charts and toggles to:
- Detect whether a filter is "fast" (i.e. flat, non-nested, single condition)
- Allow lightweight filter logic in visual widgets

Tiles **do not require fast filters** to be clickable — this is only for visual optimization.

---

## 🧠 Design Philosophy

- **Config-driven**: Everything is driven from `dashboard/config.ts`
- **Widget-agnostic**: No component-specific logic here
- **Composable**: Logic flows from `tile-calculations` → `tile-actions` → `client.tsx`
- **Safe + Predictable**: All interactive tiles must explicitly define `clickable: true` and a valid `filter`

---

## 📎 Related Patterns

| Component         | Uses this logic |
|------------------|-----------------|
| `SummaryCards`    | Yes (tiles, clickable) |
| `SectionCards`    | Yes (tiles, clickable) |
| `ChartBar`, `ChartDonut` | Yes (via data + filter props) |
| `DataTable`       | Yes (filtered output) |

---

## ✅ Copy-Paste Usage

If you are building a new widget, always:

1. Use `tileCalculations()` if your widget uses tile logic
2. Use `attachTileActions()` to make anything clickable
3. Accept `onClickFilter` or `onClick` via props — don’t hardcode behavior
4. Use `applyDataFilters()` to show filtered records

---

## 🧪 Debugging Tips

- Log inside `tile-calculations.ts` to trace percentages, trends, and averages
- Log inside `attachTileActions.ts` to trace why a tile isn’t clickable
- Use the widget `key` and `component` to trace flow in `client.tsx`

---

