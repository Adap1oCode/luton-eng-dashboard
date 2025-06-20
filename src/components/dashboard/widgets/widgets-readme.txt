# 📁 `widgets/` — Dashboard Chart Components

This folder contains **reusable chart widgets** for the dashboard. All widgets are now:

* ✅ **Generic** — no logic tied to a specific table (e.g. requisitions)
* ✅ **Config-driven** — behavior, titles, layout, and filters are passed via config
* ✅ **Theme-aware** — visuals follow the Tangerine theme via CSS vars (e.g. `--chart-1`, `--border`, `--muted`)

This README explains:

* The architectural pattern we follow
* What config is supported per widget
* How to extend a chart safely

---

## ✅ Pattern Overview

Every chart widget accepts a set of `props` passed from `DashboardClient`. These include:

| Prop          | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `data`        | Full dataset (typically range-filtered records)                    |
| `from` / `to` | Date range string (ISO format)                                     |
| `config`      | Chart config object from `config.tsx`                              |
| `rules`       | Optional: For charts driven by rule evaluation (e.g. Data Quality) |

Widgets like `<ChartAreaInteractive />`, `<ChartBar />`, etc. are fully generic and require **zero logic changes** to support new dashboards — only the config must be updated.

---

## 🧩 Supported Config Fields (`DashboardWidget`)

The `config.widgets[]` array in each `config.tsx` file defines what widgets should render. Each widget supports:

```ts
{
  key: 'data_quality_chart',
  component: 'ChartBar',
  group: 'issues',                // Optional: logic grouping
  title: 'Data Quality Issues',  // Optional: title to show in <CardTitle>
  description: 'Breakdown of...',// Optional: shown in <CardDescription>
  layout: 'horizontal',          // Optional: bar orientation
  filterType: 'issue',           // Optional: used for click filtering
  clickable: true,               // Optional: enable click-to-filter
  xAxis: false,                  // Optional: hide/show axis
  yAxis: true,
  rulesKey: 'default',           // Optional: matches dataQuality[].group
  sortBy: 'value',               // Optional: sort by label/value
  limit: 10,                     // Optional: max bars shown
  hideLegend: false,             // Optional: show/hide legends
  fields: [...],                 // Used for static charts (e.g. pie)
  toggles: [...],                // Used for interactive area charts
}
```

---

## 🎨 Styling Conventions

All widgets use:

* `<Card>` wrapper with `@container/card` class
* Padding and margins based on Tailwind spacing
* Height: `h-[260px]` inside `<ChartContainer>`
* Color themes from `--chart-1` to `--chart-6`
* Tooltip hover color: `var(--muted)`

> 📌 **Do not override spacing, radius, font sizes, or colors in chart code.**
> All visual styling should follow the Tangerine theme and layout system.

---

## 📊 Chart Types in Use

| Component              | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `ChartAreaInteractive` | Area chart with toggles (stacked line/area)                            |
| `ChartBar`             | Horizontal/vertical bar chart (configurable)                           |
| `ChartByStatus`        | Specific to `status` filter – can be migrated to generic `ChartBar`    |

---

## 🛠️ How to Add a New Widget

1. Update your dashboard's `config.tsx`:

```ts
widgets: [
  {
    key: 'my_chart',
    component: 'ChartBar',
    title: 'Records by Region',
    filterType: 'region',
    layout: 'horizontal',
    sortBy: 'value',
    clickable: true,
  }
]
```

2. If using `rulesKey`, define the matching `dataQuality[]` group in the same config.

3. No code changes are needed in the widget itself.

---

## 📂 Folder Layout

```
widgets/
├── chart-area-interactive.tsx   // Area chart with toggles
├── chart-bar.tsx                // Generic bar chart (replaces old horizontal bar)
├── chart-missing-data.tsx       // Legacy chart – do not use
├── chart-utils.ts               // getTimeBuckets, getBarChartData, etc.
├── data-table.tsx               // Reusable dashboard table
├── section-cards.tsx            // Trend cards
├── summary-cards.tsx            // Summary cards (tiles)
```

---

## 🧼 Best Practices

* ✅ Use the `ChartContainer` wrapper for all charts
* ✅ Use `props.config` for layout, toggles, and styling
* ✅ Always pass `data` via `DashboardClient` (not fetch inside widget)
* ❌ Do not hardcode titles, filters, or orientation
* ❌ Do not import Supabase or evaluate rules inside widgets

---

## ✅ Final Notes

This folder should be **readable by any dev** working on Flowmatic dashboards.
If you're building a new chart, copy from `ChartBar` or `ChartAreaInteractive` and follow the config-first approach.

All widgets must:

* Be self-contained
* Use Tailwind + Shadcn
* Pull dynamic values only from `props`
* Never hardcode styles or data fetching

Happy charting! 🧡
