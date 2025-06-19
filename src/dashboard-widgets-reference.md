
# 📊 Dashboard Widgets Reference — `src/components/dashboard/widgets`

This reference file documents each widget component inside `src/components/dashboard/widgets`.
These widgets are visual elements in the dashboard UI. All logic should remain generic.

---

## ✅ `chart-area-interactive.tsx`

**Purpose**: Displays a time-based area chart showing requisitions created vs due, grouped by week.

**Key Logic**:
- Uses `getWeekStart()` to normalize dates to weekly buckets.
- Filters data by selected date range: `90d`, `180d`, or `all`.
- Visualizes `created` and `due` trends using `AreaChart`.

**When to Edit**:
- Change time granularity (e.g., weekly to daily).
- Visualize different fields.
- Customize tooltip, curve, or chart style.

---

## ✅ `chart-by-creator.tsx`

**Purpose**: Shows a pie chart of requisitions grouped by `created_by` field.

**Key Logic**:
- Groups records by user name.
- Uses a responsive `PieChart` and customizable date range selector.
- Supports filtering the table by clicking a chart segment.

**When to Edit**:
- If the `created_by` field changes.
- To swap to another chart format.
- To support grouping by department or team.

---

## ✅ `chart-by-project.tsx`

**Purpose**: Displays a horizontal bar chart grouped by `project_number`.

**Key Logic**:
- Limits label length to 50 characters.
- Highlights top projects by requisition volume.
- Filters data based on selected date range.

**When to Edit**:
- To group by a different key (e.g., site, client).
- To normalize or transform project names.
- To change chart orientation.

---

## ✅ `chart-by-status.tsx`

**Purpose**: Shows the number of requisitions by `status` field.

**Key Logic**:
- Accepts a configurable `accessor` (default: `status`).
- Displays chart as `BarChart` with vertical axis labels.
- Can be used to highlight stuck/incomplete workflows.

**When to Edit**:
- Status values or structure change.
- You want to aggregate statuses.
- You want to color-code specific statuses.

---

## ✅ `chart-missing-data.tsx`

**Purpose**: Visualizes how many records violate configured data quality rules.

**Key Logic**:
- Accepts an array of validation rules (`is_null`, `regex`, etc.).
- Tallies rule violations by key.
- Renders as vertical bar chart with toggleable date range.

**When to Edit**:
- You want to add or update rule types.
- To fine-tune visual grouping of issues.
- To show per-user or per-project breakdown.

---

## ✅ `columns.tsx`

**Purpose**: Column configuration for the requisition table.

**Key Logic**:
- Defines accessors, column headers, custom renderers.
- Custom formatting or clickable actions go here.

**When to Edit**:
- Changing visible table columns.
- Adding tooltips, actions, icons.
- Changing column sorting or visibility.

---

## ✅ `data-table.tsx`

**Purpose**: Generic table wrapper using TanStack or custom logic.

**Key Logic**:
- Handles pagination, layout, styling.
- Reusable across dashboards.

**When to Edit**:
- Rarely. Only for global table UI updates.
- To add support for row selection, drag/drop, expandable rows.

---

## ✅ `section-cards.tsx`

**Purpose**: Displays trend tiles — value vs previous period — with up/down arrows and percentage.

**Key Logic**:
- Uses `trend`, `direction`, and thresholds to calculate badges.
- Compares current data to previous period.

**When to Edit**:
- If you need new trend logic.
- To change badge styles or arrows.
- To fix percentage bugs (common with incorrect denominator).

---

## ✅ `summary-cards.tsx`

**Purpose**: Displays simple value cards (e.g., totals, averages).

**Key Logic**:
- Comes from `metrics.summary` group.
- Supports click filters and thresholds.

**When to Edit**:
- When your metric tiles change.
- To show percentages or alternative values.
- To refine layout or labels.

---

## ✅ `table-cell-viewer.tsx`

**Purpose**: Opens a drawer to inspect additional data about a table row.

**Key Logic**:
- Shows static chart (for now).
- Provides placeholder for expanded row info.

**When to Edit**:
- If you want row-level editing or history.
- To visualize attachments or metadata.
- To change layout or interactive elements.

---

## 🔖 Suggested Save Location

- 📁 `src/components/dashboard/`
- 📝 Save as: `WIDGETS_REFERENCE.md`

Use this as a permanent dictionary for your visual components. Update as needed.

---

For full project documentation, replicate this format for:
- `src/components/dashboard/client`
- `src/components/dashboard`
- `src/app/(main)/dashboard/*` folders
