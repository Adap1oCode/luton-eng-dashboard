// scripts/verify.ts
// Usage:
//   npm run verify                -> verify ALL registered resources
//   npm run verify -- all         -> same as above
//   npm run verify -- roles       -> verify just "roles"
//   npm run verify -- roles,warehouses,role_warehouse_rules
//   npm run verify -- roles warehouses role_warehouse_rules

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { verifyResource } from "../src/lib/data/verify/verify-resource";
import { resourceConfigs } from "../src/lib/data/resources";

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  const available = Object.keys(resourceConfigs as Record<string, unknown>);

  let targets: string[];

  if (args.length === 0 || (args.length === 1 && args[0].toLowerCase() === "all")) {
    // No args or "all" => verify everything registered
    targets = available;
  } else {
    // Support comma or space separated lists
    targets = args
      .join(",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Validate targets against registered resources
  const unknown = targets.filter((t) => !available.includes(t));
  if (unknown.length) {
    console.error(`Unknown resource(s): ${unknown.join(", ")}`);
    console.error("Available:", available.join(", "));
    process.exit(1);
  }

  const results: Record<string, any> = {};
  let anyFailure = false;

  // Run sequentially to keep output readable and avoid interleaved logs
  for (const name of targets) {
    const cfg = (resourceConfigs as any)[name];
    const report = await verifyResource(name, cfg);
    results[name] = report;

    const ok =
      report?.summary?.schema_ok &&
      report?.summary?.list_ok &&
      report?.summary?.relations_ok;

    if (!ok) anyFailure = true;
  }

  // Emit a single combined JSON block
  console.log(
    JSON.stringify(
      { verified: targets, reports: results },
      null,
      2
    )
  );

  if (anyFailure) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
