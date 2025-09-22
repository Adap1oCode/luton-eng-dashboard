"use client";

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

import type { Filter } from "@/components/dashboard/client/data-filters";
import type { DashboardWidget } from "@/components/dashboard/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";

/** ✅ Utility to generate fallback values from a column */
function generateColumnCounts(records: any[], column: string) {
  const counts: Record<string, number> = {};
  for (const row of records) {
    const val = row[column] || "Unknown";
    counts[val] = (counts[val] ?? 0) + 1;
  }
  return Object.entries(counts).map(([key, count]) => ({
    key,
    label: key,
    count,
  }));
}

type Tile = {
  key: string;
  title?: string;
  value?: number;
  onClick?: () => void;
  onClickFilter?: (filter: Filter) => void;
};

type Props = {
  config: DashboardWidget & {
    column?: string;
    debug?: boolean;
  };
  data: Record<string, any>[];
  tiles?: Tile[];
  onFilterChange?: (keys: string[]) => void;
};

export default function ChartBarVertical({ config, data, tiles, onFilterChange }: Props) {
  const isMobile = useIsMobile();
  const { title, description, column = "key", debug } = config;

  let chartData: { key: string; label: string; count: number }[] = [];

  if (tiles && tiles.length > 0) {
    chartData = tiles.map((tile) => ({
      key: tile.key,
      label: tile.title ?? tile.key,
      count: tile.value ?? 0,
    }));
  } else {
    chartData = generateColumnCounts(data, column);
  }

  if (debug) {
    console.group("[ChartBarVertical DEBUG]");
    console.log("📦 config:", config);
    console.log("📊 data.length:", data.length);
    console.log("✅ tiles:", tiles);
    console.log("✅ new values output:", chartData);
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
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} horizontal={false} />

              <YAxis
                type="category"
                dataKey="label"
                width={180}
                tick={{
                  fontSize: 12,
                  fill: "var(--foreground)",
                  fontWeight: 500,
                  dx: 4,
                }}
                axisLine={false}
                tickLine={false}
              />

              <XAxis
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
