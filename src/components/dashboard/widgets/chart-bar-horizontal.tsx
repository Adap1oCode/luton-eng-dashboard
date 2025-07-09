"use client";

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

import type { Filter } from "@/components/dashboard/client/data-filters";
import type { DashboardWidget } from "@/components/dashboard/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";

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

export default function ChartBarHorizontal({ config, tiles = [], onFilterChange }: Props) {
  const { title, description, debug } = config;

  const chartData = tiles.map((tile) => ({
    key: tile.key,
    label: tile.title ?? tile.key,
    count: tile.value ?? 0,
  }));

  if (debug) {
    console.group("[ChartBarHorizontal DEBUG]");
    console.log("📦 config:", config);
    console.log("✅ tiles:", tiles);
    console.log("📊 chartData:", chartData);
    console.groupEnd();
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <ChartContainer
          className="h-auto min-h-[260px] w-full"
          config={Object.fromEntries(chartData.map((d) => [d.label, { label: d.label }]))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal" margin={{ top: 12, right: 24, left: 24, bottom: 90 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)", fontWeight: 400 }}
                interval={0}
                angle={-40}
                textAnchor="end"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)", fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
              />

              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                content={<ChartTooltipContent indicator="dot" labelFormatter={(label) => label} />}
              />

              <Bar
                dataKey="count"
                cursor="pointer"
                radius={[4, 4, 0, 0]}
                onClick={(_, index) => {
                  const tile = tiles?.[index];
                  tile?.onClick?.();
                  if (tile?.onClickFilter) {
                    onFilterChange?.([tile.onClickFilter]);
                  }
                }}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
