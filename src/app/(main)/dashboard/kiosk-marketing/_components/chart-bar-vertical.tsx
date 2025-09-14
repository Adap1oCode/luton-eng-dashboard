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
  { label: "Facebook", count: 564 },
  { label: "Google Ads", count: 134 },
  { label: "LinkedIn", count: 312 },
  { label: "Organic Search", count: 489 },
  { label: "Email Campaigns", count: 276 },
  { label: "Referral", count: 182 },
];

export default function ChartBarVertical() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Leads by Source</CardTitle>
        <CardDescription>
          Breakdown of total leads generated per channel over last 3 months
        </CardDescription>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="h-[260px] w-full"
          config={Object.fromEntries(leadSources.map((d) => [d.label, { label: d.label }]))}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadSources} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} horizontal={false} />

              <YAxis
                type="category"
                dataKey="label"
                width={120}
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