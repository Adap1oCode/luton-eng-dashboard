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

const leadSources = [
  { label: "Google Ads", count: 5.78 },
  { label: "Facebook Ads", count: 4.32 },
  { label: "LinkedIn", count: 6.45 },
  { label: "Email", count: 2.45 },
  { label: "YouTube", count: 2.89 },
  { label: "Organic", count: 1.94 },
];

export default function ChartBarVertical() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Cost per Lead</CardTitle>
        <CardDescription>
          Performance breakdown over last 90 days
        </CardDescription>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="h-[260px] w-full"
          config={Object.fromEntries(leadSources.map((d) => [d.label, { label: d.label }]))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadSources}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
                horizontal={false}
              />

              <XAxis
                type="category"
                dataKey="label"
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

              <Bar dataKey="count" radius={[5, 5, 5, 5]}>
                {leadSources.map((_, i) => (
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
