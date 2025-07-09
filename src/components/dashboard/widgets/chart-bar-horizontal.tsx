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
  };
  data: Record<string, any>[];
  tiles?: Tile[];
  onFilterChange?: (filters: Filter[]) => void;
};

/** Utility fallback: generate chart values from raw records */
function generateColumnCounts(records: any[], column: string) {
  const counts: Record<string, number> = {};
  for (const row of records) {
    const val = row[column] ?? "Unknown";
    counts[val] = (counts[val] ?? 0) + 1;
  }
  return Object.entries(counts).map(([key, count]) => ({
    key,
    label: key,
    count,
  }));
}

export default function ChartBarHorizontal({ config, data, tiles, onFilterChange }: Props) {
  const { title, description, debug } = config;
  const column = config.column ?? "key";

  const chartData =
    tiles && tiles.length > 0
      ? tiles.map((tile) => ({
          key: tile.key,
          label: tile.title ?? tile.key,
          count: tile.value ?? 0,
        }))
      : generateColumnCounts(data, column);

  if (debug) {
    console.group("[ChartBarHorizontal DEBUG]");
    console.log("📦 config:", config);
    console.log("📊 data.length:", data.length);
    console.log("✅ tiles:", tiles);
    console.log("🔍 fallback column:", column);
    console.log("📊 chartData:", chartData);
    console.groupEnd();
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="h-[260px] w-full"
          config={Object.fromEntries(chartData.map((d) => [d.label, { label: d.label }]))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} horizontal={false} />

              <XAxis
                type="category"
                dataKey="label"
                angle={-40}
                textAnchor="end"
                interval={0}
                tick={{
                  fontSize: 12,
                  fill: "var(--foreground)",
                  fontWeight: 500,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="number"
                domain={[0, "dataMax"]}
                tick={{
                  fontSize: 12,
                  fill: "var(--muted-foreground)",
                }}
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
                onClick={(_, index) => {
                  const tile = tiles?.[index];
                  tile?.onClick?.();
                  if (tile?.onClickFilter) {
                    onFilterChange?.([tile.onClickFilter]);
                  }
                }}
                cursor="pointer"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
