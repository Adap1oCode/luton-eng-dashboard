import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const indicators = {
  good: "bg-green-500",
  warning: "bg-amber-400",
  bad: "bg-red-500"
};

const tiles = [
  { title: "Total Spend", value: "£12,340", level: "good", note: "Healthy investment" },
  { title: "Cost per Lead", value: "£7.89", level: "good", note: "Efficient acquisition" },
  { title: "Total Leads", value: "1,564", level: "good", note: "Strong pipeline" },
  { title: "Visitors", value: "45,678", level: "warning", note: "Stable traffic" },
  { title: "New Customers", value: "1,234", level: "bad", note: "Conversion drop" },
  { title: "Email Signups", value: "3,421", level: "good", note: "Above target" },
  { title: "LinkedIn CTR", value: "2.3%", level: "warning", note: "Needs testing" },
  { title: "YouTube Views", value: "89,241", level: "good", note: "Trending up" },
  { title: "Avg Session Time", value: "3m 24s", level: "good", note: "Improved engagement" },
  { title: "Facebook ROAS", value: "3.7x", level: "good", note: "Strong returns" },
  { title: "Google CPL", value: "£6.25", level: "warning", note: "Slight increase" },
  { title: "Campaigns Active", value: "14", level: "bad", note: "Too many live" }
];

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {tiles.map((tile) => (
        <Card key={tile.title} className="@container/card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>{tile.title}</CardDescription>
              <div
                className={cn("size-2 rounded-full", indicators[tile.level as keyof typeof indicators])}
                title={tile.note}
              />
            </div>
            <CardTitle className="text-2xl font-semibold tabular-nums">{tile.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
