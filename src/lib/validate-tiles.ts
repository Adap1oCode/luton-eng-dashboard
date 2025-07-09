import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

import type { DashboardConfig } from "@/components/dashboard/types";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase credentials not set in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveValue(value: any): any {
  return value === "today" ? new Date().toISOString().split("T")[0] : value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(query: any, filter: any): any {
  if (Array.isArray(filter.and)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter.and.forEach((f: any) => {
      query = applyFilter(query, f);
    });

    return query;
  }

  if (Array.isArray(filter.or)) {
    console.warn('⚠️ "or" filter unsupported in validator');
    return query;
  }

  const { column, isNull, contains, not_contains, lt } = filter;

  if (isNull !== undefined) return isNull ? query.is(column, null) : query.not(column, "is", null);
  if (contains !== undefined) return query.ilike(column, `%${contains}%`);
  if (not_contains !== undefined) return query.not(column, "ilike", `%${not_contains}%`);
  if (lt !== undefined) return query.lt(column, resolveValue(lt));

  return query;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDisplayTitle(tile: any): string {
  return tile?.title ?? tile?.label ?? "Untitled";
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Math.ceil((+new Date(b) - +new Date(a)) / (1000 * 60 * 60 * 24)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isType(tile: any, expected: string): boolean {
  return typeof tile?.type === "string" && tile.type === expected;
}

export type ValidationResult = {
  dashboard: string;
  key: string;
  label: string;
  status: "pass" | "fail";
  value: number | string | null;
};

// eslint-disable-next-line complexity
export async function runValidation(config: DashboardConfig, configId: string): Promise<ValidationResult[]> {
  console.log(`▶️ Validating dashboard: ${configId}`);
  const results: ValidationResult[] = [];

  const allTiles = [...(config.summary ?? []), ...(config.trends ?? []), ...(config.dataQuality ?? [])];

  for (const tile of allTiles) {
    const displayTitle = getDisplayTitle(tile);

    try {
      if ("average" in tile && tile.average) {
        const { start, end } = tile.average;
        const { data, error } = await supabase
          .from(config.id)
          .select(`${start}, ${end}`)
          .not(start, "is", null)
          .not(end, "is", null);

        if (error || !data) {
          console.error(`❌ Avg tile "${displayTitle}" failed`, error);
          results.push({ dashboard: configId, key: tile.key, label: displayTitle, value: "error", status: "fail" });
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const days = data.map((row: any) => daysBetween(row[start], row[end])).filter(Boolean);
        const avg = Math.round(days.reduce((a, b) => a + b, 0) / days.length);

        console.log(`📊 ${displayTitle.padEnd(28)} → Average days: ${avg}`);
        results.push({ dashboard: configId, key: tile.key, label: displayTitle, value: avg, status: "pass" });
        continue;
      }

      if ("type" in tile && "column" in tile && typeof tile.column === "string") {
        const column = tile.column;

        if (isType(tile, "is_null")) {
          const { count } = await supabase.from(config.id).select("*", { count: "exact", head: true }).is(column, null);

          results.push({ dashboard: configId, key: tile.key, label: displayTitle, value: count, status: "pass" });
          continue;
        }

        if (isType(tile, "regex") && "pattern" in tile && typeof tile.pattern === "string") {
          const { count } = await supabase
            .from(config.id)
            .select("*", { count: "exact", head: true })
            .not(column, "regexp", tile.pattern);

          results.push({ dashboard: configId, key: tile.key, label: displayTitle, value: count, status: "pass" });
          continue;
        }

        if (isType(tile, "invalid_date")) {
          const { data } = await supabase.from(config.id).select(column);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const invalids = (data ?? []).filter((r: any) => isNaN(Date.parse(r[column] ?? "")));
          results.push({
            dashboard: configId,
            key: tile.key,
            label: displayTitle,
            value: invalids.length,
            status: "pass",
          });
          continue;
        }

        if (isType(tile, "gt") && "min" in tile) {
          const { count } = await supabase
            .from(config.id)
            .select("*", { count: "exact", head: true })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .gt(column, (tile as any).min);

          results.push({ dashboard: configId, key: tile.key, label: displayTitle, value: count, status: "pass" });
          continue;
        }

        if (isType(tile, "one_of") && "values" in tile && Array.isArray((tile as any).values)) {
          const { data } = await supabase.from(config.id).select(column);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const invalid = (data ?? []).filter((r: any) => !(tile as any).values.includes(r[column]));
          results.push({
            dashboard: configId,
            key: tile.key,
            label: displayTitle,
            value: invalid.length,
            status: "pass",
          });
          continue;
        }
      }

      if ("filter" in tile && tile.filter) {
        let query = supabase.from(config.id).select("*", { count: "exact", head: true });

        query = applyFilter(query, tile.filter);
        const { count, error } = await query;

        if (error) {
          console.error(`❌ Filter failed for "${displayTitle}":`, error);
          results.push({ dashboard: configId, key: tile.key, label: displayTitle, value: "error", status: "fail" });
          continue;
        }

        results.push({ dashboard: configId, key: tile.key, label: displayTitle, value: count, status: "pass" });
        continue;
      }

      console.log(`⚠️ ${displayTitle} skipped (no filter or logic)`);
    } catch (err) {
      console.error(`❌ Unexpected error in tile "${"key" in tile ? tile.key : "unknown"}":`, err);
      results.push({
        dashboard: configId,
        key: tile.key ?? "unknown",
        label: displayTitle,
        value: "error",
        status: "fail",
      });
    }
  }

  console.log(`🏁 Validation complete for "${configId}"`);
  return results;
}
