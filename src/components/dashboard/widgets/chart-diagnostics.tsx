"use client";

import * as React from "react";

import { Terminal } from "lucide-react";

import type { DashboardWidget } from "@/components/dashboard/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface Props {
  widget: DashboardWidget;
  data?: Record<string, unknown>[];
  from?: string;
  to?: string;
  rules?: any[];
  rawRecords?: { key: string; label: string; value: number }[];
  children: React.ReactNode;
}

// 🧠 Known requirements per chart component (loosened type to bypass TS limitation.)
const CHART_REQUIREMENTS: Record<string, string[]> = {
  ChartBar: ["filterType", "rulesKey"],
  ChartAreaInteractive: ["toggles"],
  ChartByStatus: ["filterType"],
  ChartDonut: ["filterType"],
  ChartByProject: ["filterType"],
};

// 🔍 Check for base runtime data issues
function getBaseErrors(data: unknown, from?: string, to?: string): string[] {
  const errs: string[] = [];
  if (!from || !to) errs.push("Missing `from` or `to` date range.");
  if (!Array.isArray(data)) errs.push("Data is not an array.");
  else if (data.length === 0) errs.push("Data array is empty.");
  return errs;
}

// 🔍 Check required keys based on widget type
function getConfigErrors(widget: DashboardWidget): string[] {
  const keys = CHART_REQUIREMENTS[widget.component] || [];
  return keys
    .filter((k) => (widget as Record<string, unknown>)[k] === undefined)
    .map((k) => `Missing required config: \`${k}\` for ${widget.component}.`);
}

export function ChartDiagnostics({ widget, data, from, to, rules = [], children }: Props) {
  const { component, title, description, debug = false } = widget;

  const errors = [...getBaseErrors(data, from, to), ...getConfigErrors(widget)];

  if (component === "ChartBar") {
    if (!Array.isArray(rules) || rules.length === 0) {
      errors.push("No rules passed for ChartBar — check `rulesKey` or dataQuality config.");
    }
  }

  if (debug) {
    console.warn(`[ChartDiagnostics] Debug: ${component}`, {
      from,
      to,
      data,
      widget,
      rules,
    });
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        {errors.length > 0 ? (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Chart not rendered</AlertTitle>
            <AlertDescription>
              <ul className="space-y-1">
                {errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
