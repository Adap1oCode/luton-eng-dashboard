// src/components/dashboard/widgets/chart-bar-horizontal-v2.tsx

"use client";

import React from "react";
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

type FilterTree = { and: Filter[] } | { or: Filter[] };

/**
 * Recursively clone a FilterTree and replace every "__KEY__" placeholder with the actual value.
 */
function hydrateFilterTree<T extends object>(tree: T, key: string): T {
  const clone = JSON.parse(JSON.stringify(tree));
  (function walk(obj: any) {
    for (const k of Object.keys(obj)) {
      if (obj[k] === "__KEY__") {
        obj[k] = key;
      } else if (typeof obj[k] === "object" && obj[k] !== null) {
        walk(obj[k]);
      }
    }
  })(clone);
  return clone;
}

type Props = {
  config: DashboardWidget & {
    column: string;
    valueField: string;
    preCalculated: true;
    /** static JSON filter template with "__KEY__" placeholder */
    filter: FilterTree;
    rpcName: string;
    debug?: boolean;
    autoScale?: boolean;
  };
  data: Record<string, any>[];
  /** Called when a bar is clicked */
  onDrilldown: (rpcName: string, filters: Filter[]) => void;
};

export default function ChartBarHorizontalV2({
  config,
  data,
  onDrilldown,
}: Props) {
  const {
    title,
    description,
    column,
    valueField,
    rpcName,
    filter: template,
    debug,
    autoScale = true,
  } = config;

  // Step 1: build chartData from pre-calculated rows
  let chartData = data.map((row) => {
    const rawKey = row[column] ?? "Unknown";
    return {
      key: String(rawKey),
      label: String(rawKey),
      count: Number(row[valueField]) || 0,
    };
  });

  if (debug) {
    console.group("[ChartBarHorizontalV2 DEBUG] raw chartData");
    console.log(chartData);
    console.groupEnd();
  }

  // Step 2: apply auto-scale if enabled
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
      ...d,
      count: Math.round((d.count / scale) * 100) / 100,
    }));
  }

  // Step 3: nice y-axis ticks
  const intervals = 4;
  const maxCount = chartData.length
    ? Math.max(...chartData.map((d) => d.count))
    : 0;
  const rawStep = maxCount / intervals || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const yTicks = Array.from({ length: intervals + 1 }, (_, i) => i * niceStep);

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1">
        <ChartContainer
          className="h-full w-full"
          config={Object.fromEntries(
            chartData.map((d) => [d.label, { label: d.label }])
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              onClick={(_, i) => {
                const { key } = chartData[i];
                if (debug) console.debug(`[V2] Bar clicked: key=${key}`);
                // hydrate and flatten filter template
                const tree = hydrateFilterTree(template, key);
                let clauses: Filter[];
                if ("and" in tree) clauses = tree.and;
                else if ("or" in tree) clauses = tree.or;
                else clauses = [tree as unknown as Filter];
                if (debug) console.debug("[V2] Filters:", clauses);
                onDrilldown(rpcName, clauses);
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
                vertical={false}
              />
              <XAxis
                type="category"
                dataKey="label"
                angle={-40}
                textAnchor="end"
                interval={0}
                height={120}
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
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
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(label) => label}
                  />
                }
              />
              <Bar dataKey="count" radius={[5, 5, 5, 5]} cursor="pointer">
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
