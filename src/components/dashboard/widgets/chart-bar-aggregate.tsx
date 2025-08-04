"use client";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

import type { Filter } from "@/components/dashboard/client/data-filters";
import type { DashboardWidget } from "@/components/dashboard/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { getBarChartData } from "@/components/dashboard/widgets/chart-utils";
import { buildClickFilters } from "@/components/dashboard/client/tile-actions";
import { normalizeFieldValue } from "@/components/dashboard/client/normalize"; // ✅

// ✅ Match ChartBarVertical structure

/** ✅ Props with consistent filtering support */
type Props = {
  config: DashboardWidget & {
    column: string;
    valueField?: string;
    metric?: "sum" | "average" | "min" | "max" | "count";
    sortBy?: "label" | "value";
    limit?: number;
    debug?: boolean;
    from: string;
    to: string;
    noRangeFilter?: boolean;
  };
  data: Record<string, any>[];
  onFilterChange?: (filters: Filter[]) => void;
};

export default function ChartBarAggregate({
  config,
  data,
  onFilterChange,
}: Props) {
  const {
    title,
    description,
    column,
    valueField,
    metric = "count",
    sortBy = "value",
    limit,
    from,
    to,
    noRangeFilter = false,
    debug,
  } = config;

  const chartData = getBarChartData(data, column, {
    valueField,
    metric,
    sortBy,
    limit,
  }).map((item) => ({
    ...item,
    key: normalizeFieldValue(item.key),       // ✅ normalize key
    label: normalizeFieldValue(item.label),   // ✅ normalize label
    count: item.value,
  }));

  if (debug) {
    console.group("[ChartBarAggregate DEBUG]");
    console.log("📦 config:", config);
    console.log("📊 data.length:", data.length);
    console.log("🔑 group column:", column);
    console.log("💰 valueField:", valueField);
    console.log("📐 metric:", metric);
    console.table(chartData);
    console.log("🗓️ from:", from);
    console.log("🗓️ to:", to);
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
          config={Object.fromEntries(
            chartData.map((d) => [d.label, { label: d.label }])
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
                horizontal={false}
              />

              <XAxis
                type="category"
                dataKey="label"
                angle={-40}
                textAnchor="end"
                interval={0}
                height={120}
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
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(label) => label}
                  />
                }
              />

              <Bar
                dataKey="count"
                radius={[5, 5, 5, 5]}
                onClick={(_, index) => {
                  const key = chartData[index]?.key;
                  const label = chartData[index]?.label;

                  console.debug("[📊 Bar Clicked]", {
                    index,
                    label,
                    key,
                    column,
                  });

                  if (key && column && onFilterChange) {
                    const filters = buildClickFilters({
                      column,
                      value: key,
                      from,
                      to,
                      noRangeFilter,
                    });

                    console.debug("[🧩 Filters Generated on Click]", filters);

                    onFilterChange(filters);
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
