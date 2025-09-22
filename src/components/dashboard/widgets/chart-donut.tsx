"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import type { DashboardWidget } from "@/components/dashboard/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Utility to check if date is within range
function isWithinRange(dateStr: string | null | undefined, from: string, to: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date >= new Date(from) && date <= new Date(to);
}

interface Props {
  config: DashboardWidget & {
    column?: string;
    debug?: boolean;
  };
  data: Record<string, any>[];
  from: string;
  to: string;
  onFilterChange?: (values: string[]) => void;
}

export default function ChartDonut({ config, data, from, to, onFilterChange }: Props) {
  const { title, description, column = "key", debug } = config;

  // ✅ Filter by from/to
  const filtered = data.filter((row) => isWithinRange(row.created_at ?? row.order_date, from, to));

  const counts: Record<string, number> = {};
  for (const row of filtered) {
    const key = row[column]?.toString().trim() ?? "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const chartData = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (debug) {
    console.group("[ChartDonut DEBUG]");
    console.log("📦 config:", config);
    console.log("📊 input data.length:", data.length);
    console.log("📆 filtered data.length:", filtered.length);
    console.log("🧮 generated chartData:", chartData);
    console.groupEnd();
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="px-0 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="mx-auto aspect-square max-h-[260px] w-full"
          config={Object.fromEntries(chartData.map((d) => [d.name, { label: d.name }]))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={0}
                labelLine={false}
                label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                onClick={(entry) => onFilterChange?.([entry.name])}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormatter={(label) => label} />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
