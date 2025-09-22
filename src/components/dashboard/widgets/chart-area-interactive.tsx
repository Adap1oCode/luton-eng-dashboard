"use client";

import * as React from "react";

import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

import { getTimeBuckets } from "./chart-utils";

type DataItem = { [key: string]: any };

type Field = {
  key: string;
  label: string;
  type: string;
  band?: string;
  color: string;
};

type Toggle = {
  key: string;
  title: string;
  description?: string;
  fields: Field[];
};

type Props = {
  data: DataItem[];
  from?: string;
  to?: string;
  config?: {
    toggles?: Toggle[];
  };
};

const accessorMap: Record<string, (row: DataItem, band?: string) => string | null | undefined> = {
  created: (row) => row?.order_date ?? null,
  due: (row) => row?.due_date ?? null,
  lateness: (row, band) => {
    const status = row?.status?.toLowerCase();
    const dueStr = row?.due_date;
    if (!dueStr || status?.includes("complete") || status?.includes("cancel")) return null;

    const due = new Date(dueStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    if (band === "1-7" && diff > 0 && diff <= 7) return dueStr;
    if (band === "8-30" && diff > 7 && diff <= 30) return dueStr;
    if (band === "30+" && diff > 30) return dueStr;
    return null;
  },
};

export default function ChartAreaInteractive({ data, from, to, config }: Props) {
  const isMobile = useIsMobile();
  const toggles = config?.toggles ?? [];
  const [activeKey, setActiveKey] = React.useState<string>(toggles[0]?.key ?? "");
  const activeToggle = toggles.find((w) => w.key === activeKey);

  if (!from || !to || !Array.isArray(data) || data.length === 0 || !activeToggle) return null;

  const fields = activeToggle.fields.map((f) => ({
    ...f,
    accessor: (row: DataItem) => accessorMap[f.type]?.(row, f.band),
  }));

  const chartData = getTimeBuckets(data, { from, to, fields });

  const summary = fields.map((f) => {
    const total = chartData.reduce((sum, row) => sum + (row[f.key] ?? 0), 0);
    return { key: f.key, label: f.label, color: f.color, total };
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{activeToggle.title ?? "Records Over Time"}</CardTitle>
            {activeToggle.description && <CardDescription>{activeToggle.description}</CardDescription>}
          </div>
          {toggles.length > 1 && (
            <ToggleGroup
              type="single"
              value={activeKey}
              onValueChange={(val) => setActiveKey(val ?? toggles[0]?.key ?? "")}
              variant="outline"
            >
              {toggles.map((w) => (
                <ToggleGroupItem
                  key={w.key}
                  value={w.key}
                  disabled={!w.key}
                  className="px-6 py-2" // 👈 wider buttons with more padding
                >
                  {w.title ?? w.key ?? "Unnamed"}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        {/* <div className="mb-2 flex justify-end gap-4 text-xs text-muted-foreground px-2">
  {summary.map((s) => (
    <div key={s.key} className="flex items-center gap-1">
      <span className="font-medium text-foreground">{s.total}</span>
      <span>{s.label}</span>
    </div>
  ))}
</div> */}

        <div className="text-muted-foreground mb-2 flex justify-end gap-4 px-2 text-sm">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <div className="h-2 w-4 rounded-sm" style={{ backgroundColor: f.color }} />
              {f.label}
            </div>
          ))}
        </div>

        <ChartContainer
          config={Object.fromEntries(fields.map((f) => [f.key, { label: f.label, color: f.color }]))}
          className="aspect-auto h-[260px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              {fields.map((f) => (
                <linearGradient key={f.key} id={`fill-${f.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={f.color} stopOpacity={1.0} />
                  <stop offset="95%" stopColor={f.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12 }} />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              defaultIndex={isMobile ? -1 : 10}
              content={({ payload, label }) =>
                payload && payload.length ? (
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(val) => `Week of ${val}`}
                    payload={payload}
                    label={label}
                  />
                ) : null
              }
            />

            {fields.map((f) => (
              <Area key={f.key} dataKey={f.key} type="monotone" fill={`url(#fill-${f.key})`} stroke={f.color} />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
