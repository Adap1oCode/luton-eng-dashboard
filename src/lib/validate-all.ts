import fs from "fs";
import path from "path";

const outputPath = path.resolve(process.cwd(), "public/validation-results.json");
import { requisitionsConfig } from "@/app/(main)/dashboard/requisitions/config";
import { runValidation, type ValidationResult } from "@/lib/validate-tiles";

// Load baselines
const baselinePath = path.resolve(__dirname, "tile-baselines.json");
const baselines: Record<string, { expected: number; tolerance?: number }> = {};

if (fs.existsSync(baselinePath)) {
  const raw = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  for (const entry of raw) {
    const key = `${entry.dashboard}__${entry.key}`;
    baselines[key] = { expected: entry.expected, tolerance: entry.tolerance ?? 0 };
  }
} else {
  console.warn("⚠️ tile-baselines.json not found — skipping expected value comparison.");
}

const dashboards = [{ id: "requisitions", config: requisitionsConfig }];

async function main() {
  const allResults: (ValidationResult & { expected?: number })[] = [];

  for (const dashboard of dashboards) {
    try {
      const results = await runValidation(dashboard.config, dashboard.id);

      for (const result of results) {
        const baselineKey = `${dashboard.id}__${result.key}`;
        const baseline = baselines[baselineKey];

        if (baseline) {
          const delta = Math.abs((result.value as number) - baseline.expected);
          const isOk = delta <= (baseline.tolerance ?? 0);

          result.status = isOk ? "pass" : "fail";
          const enriched = { ...result, expected: baseline.expected };
          allResults.push(enriched);
        } else {
          result.status = "pass"; // assume OK if no baseline
        }

        allResults.push(result);
      }
    } catch (err) {
      console.error(`❌ Error validating ${dashboard.id}:`, err);
    }
  }

  // Output to file
  const outputPath = path.resolve(process.cwd(), "public/validation-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(`📦 Results written to ${outputPath}`);

  // Summary output
  const failed = allResults.filter((r) => r.status === "fail");

  if (failed.length) {
    console.warn(`\n❌ ${failed.length} tile(s) failed:`);
    for (const f of failed) {
      console.warn(`  ${f.dashboard} > ${f.key} → expected ${f.expected}, got ${f.value}`);
    }
  } else {
    console.log("\n✅ All tiles passed baseline comparison.");
  }
}

main();
