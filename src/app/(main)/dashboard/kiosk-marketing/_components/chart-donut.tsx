"use client";

import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";

// ✅ Chart data
const data = [
  { channel: "Google Ads", spend: 3200 },
  { channel: "Facebook Ads", spend: 2800 },
  { channel: "LinkedIn", spend: 1500 },
  { channel: "Email", spend: 900 },
  { channel: "YouTube", spend: 700 },
];

// ✅ Theme color variables (from TweakCN / shadcn theme)
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function ChartDonut() {
  return (
    <Card className="@container/card">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-center">Spend by Channel</CardTitle>
        <CardDescription className="text-center">
          Proportional spend allocation
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center pb-0">
        <div
          data-chart="chart-donut"
          className="mx-auto aspect-square max-h-[300px] w-full text-xs [&_.recharts-sector[stroke='none']]:stroke-transparent"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="spend"
                nameKey="channel"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={115}
                stroke="none"
                paddingAngle={0} // No gaps
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none" // no white slice borders
                  />
                ))}
              </Pie>

              {/* Center Text — must use inline SVG styles for proper hydration */}
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--foreground)"
                fontSize="24"
                fontWeight="600"
              >
                £12,340
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--muted-foreground)"
                fontSize="12"
              >
                Total Spend
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Trend */}
        <div className="flex flex-col items-center gap-1 pt-4 text-sm">
          <div className="flex items-center gap-1 font-medium leading-none text-muted-foreground">
            Increased by 5.2% this month
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-trending-up h-4 w-4"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <div className="leading-none text-muted-foreground">
            Showing total spend for the last 3 months
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
