"use client";

import * as React from "react";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { format, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Moved DateInput component outside to fix react/no-unstable-nested-components
const DateInput = ({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: Date | undefined;
  onSelect: (d: Date) => void;
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <CalendarIcon className="size-4" />
          {value ? format(value, "dd MMM yyyy") : `Select ${label}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            if (d) onSelect(d);
            setOpen(false);
          }}
          initialFocus
          required
        />
      </PopoverContent>
    </Popover>
  );
};

/**
 * SearchDialog renders date filters in the sidebar,
 * but is hard-coded to never render on the Inventory dashboard.
 */
export function SearchDialog() {
  // Hooks must always run in the same order:
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const preset = searchParams.get("range") ?? "3m";
  const paramFrom = searchParams.get("from");
  const paramTo = searchParams.get("to");

  const [from, setFrom] = React.useState<Date | undefined>(paramFrom ? new Date(paramFrom) : undefined);
  const [to, setTo] = React.useState<Date | undefined>(paramTo ? new Date(paramTo) : undefined);

  // Fixed react-hooks/exhaustive-deps by adding missing dependencies
  React.useEffect(() => {
    if (!paramFrom || !paramTo) {
      const today = new Date();
      let fromDate: Date;

      if (preset === "3m") fromDate = subMonths(today, 3);
      else if (preset === "6m") fromDate = subMonths(today, 6);
      else fromDate = subMonths(today, 12);

      setFrom(fromDate);
      setTo(today);
    }
  }, [paramFrom, paramTo, preset]); // Added missing dependencies

  // Early return if on inventory dashboard
  if (pathname.includes("/dashboard/inventory")) {
    return null;
  }

  const applyCustomRange = (fromDate: Date, toDate: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", format(fromDate, "yyyy-MM-dd"));
    params.set("to", format(toDate, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const handleDateChange = (key: "from" | "to", date: Date | undefined) => {
    if (key === "from") setFrom(date);
    else setTo(date);

    const f = key === "from" ? date : from;
    const t = key === "to" ? date : to;
    if (f && t) applyCustomRange(f, t);
  };

  const handlePreset = (value: string) => {
    const today = new Date();
    let fromDate: Date;

    if (value === "3m") fromDate = subMonths(today, 3);
    else if (value === "6m") fromDate = subMonths(today, 6);
    else fromDate = subMonths(today, 12);

    const toDate = today;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    params.set("from", format(fromDate, "yyyy-MM-dd"));
    params.set("to", format(toDate, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();

    setFrom(fromDate);
    setTo(toDate);
  };

  return (
    <div className="text-muted-foreground flex flex-col items-start gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <DateInput label="From" value={from} onSelect={(d) => handleDateChange("from", d)} />
        <DateInput label="To" value={to} onSelect={(d) => handleDateChange("to", d)} />
      </div>

      <ToggleGroup
        type="single"
        value={preset !== "custom" ? preset : undefined}
        onValueChange={(val) => val && handlePreset(val)}
        className="w-full justify-start gap-1 sm:w-auto sm:justify-center"
      >
        <ToggleGroupItem value="3m" className="flex-1 px-2 py-1 text-xs sm:flex-none sm:px-3">
          Last 3M
        </ToggleGroupItem>
        <ToggleGroupItem value="6m" className="flex-1 px-2 py-1 text-xs sm:flex-none sm:px-3">
          Last 6M
        </ToggleGroupItem>
        <ToggleGroupItem value="12m" className="flex-1 px-2 py-1 text-xs sm:flex-none sm:px-3">
          Last 12M
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
