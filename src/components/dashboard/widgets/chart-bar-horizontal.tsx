// src/components/dashboard/widgets/chart-bar-horizontal.tsx

"use client";

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

import type { Filter } from "@/components/dashboard/client/data-filters";
import type { DashboardWidget } from "@/components/dashboard/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Tile = {
  key: string;
  title?: string;
  value?: number;
  onClick?: () => void;
  onClickFilter?: Filter;
};

type Props = {
  config: DashboardWidget & {
    column?: string;
    debug?: boolean;
    valueField?: string;
    preCalculated?: boolean;
    /** enable automatic unit scaling */
    autoScale?: boolean;
    clickable?: boolean;
  };
  data: Record<string, any>[];
  tiles?: Tile[];
  onFilterChange?: (filters: Filter[]) => void;
};

function generateColumnCounts(records: any[], column: string) {
  const counts: Record<string, number> = {};
  for (const row of records) {
    const key = row[column] ?? "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([key, count]) => ({ key, label: key, count }));
}

export default function ChartBarHorizontal({ config, data, tiles, onFilterChange }: Props) {
  console.log(
    "📊 ChartBarHorizontal received data keys:",
    data.map((d) => d.key),
    "length:",
    data.length,
  );

  console.group("[ChartBarHorizontal PROPS]");

  console.group("[ChartBarHorizontal PROPS]");
  console.log("config.clickable:", config.clickable);
  console.log("tiles:", tiles);
  console.log("onFilterChange:", onFilterChange);
  console.groupEnd();

  const { title, description, column = "key", debug, valueField, preCalculated, autoScale = true, clickable } = config;

  // STEP 0: DEBUG LOG which branch we’ll take
  if (debug) {
    console.group("[ChartBarHorizontal DEBUG] incoming tiles");
    console.log("  clickable:", clickable);
    console.log("  tiles:", tiles);
    console.groupEnd();
  }

  // Step 1: build raw chartData
  let chartData: { key: string; label: string; count: number }[] = [];
  if (tiles && tiles.length > 0) {
    // TILE-BASED branch
    chartData = tiles.map((tile) => ({
      key: tile.key,
      label: tile.title ?? tile.key,
      count: tile.value ?? 0,
    }));
  } else if (preCalculated && valueField) {
    // RAW-DATA branch
    chartData = data.map((row) => {
      const rawKey = row[column] ?? "Unknown";
      const cnt = Number(row[valueField]) || 0;
      return { key: String(rawKey), label: String(rawKey), count: cnt };
    });
  } else {
    // FALLBACK branch
    chartData = generateColumnCounts(data, column);
  }

  // Step 2: auto-scale…
  let suffix = "";
  if (autoScale && chartData.length) {
    const maxVal = Math.max(...chartData.map((d) => d.count));
    let scale = 1;
    if (maxVal >= 1e9) {
      scale = 1e9;
      suffix = "B";
    } else if (maxVal >= 1e6) {
      scale = 1e6;
      suffix = "M";
    } else if (maxVal >= 1e3) {
      scale = 1e3;
      suffix = "K";
    }
    chartData = chartData.map((d) => ({
      key: d.key,
      label: d.label,
      count: Math.round((d.count / scale) * 100) / 100,
    }));
  }

  // Step 3: nice y-ticks…
  const intervals = 4;
  const maxCount = chartData.length ? Math.max(...chartData.map((d) => d.count)) : 0;
  const rawStep = maxCount / intervals;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const yTicks: number[] = Array.from({ length: intervals + 1 }, (_, i) => i * niceStep);

  if (debug) {
    console.group("[ChartBarHorizontal DEBUG]");
    console.log("computed chartData:", chartData);
    console.log("yTicks:", yTicks);
    console.groupEnd();
  }

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="h-full w-full"
          config={Object.fromEntries(chartData.map((d) => [d.label, { label: d.label }]))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} vertical={false} />
              <XAxis
                type="category"
                dataKey="label"
                angle={-40}
                textAnchor="end"
                interval={0}
                height={120}
                tick={{ fontSize: 12, fill: "var(--foreground)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                allowDuplicatedCategory={true}
              />
              <YAxis
                type="number"
                domain={[0, yTicks[yTicks.length - 1]]}
                ticks={yTicks}
                tickFormatter={(v) => `${v}${suffix}`}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                content={<ChartTooltipContent indicator="dot" labelFormatter={(label) => label} />}
              />
              <Bar
                dataKey="count"
                radius={[5, 5, 5, 5]}
                cursor="pointer"
                onClick={(data, index) => {
                  console.group("[ChartBarHorizontal] click event");
                  console.log("  click payload:", data, "index:", index);
                  const tile = tiles?.[index];
                  console.log("  matched tile:", tile);
                  console.log("  calling tile.onClick()");
                  tile?.onClick?.();
                  if (tile?.onClickFilter) {
                    console.log("  calling tile.onClickFilter()");
                    onFilterChange?.([tile.onClickFilter]);
                  } else {
                    console.log("  no onClickFilter for this tile");
                  }
                  console.groupEnd();
                }}
              >
                {chartData.map((entry, i) => (
                  <Cell key={`${entry.key}-${i}`} fill={`var(--chart-${(i % 5) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
