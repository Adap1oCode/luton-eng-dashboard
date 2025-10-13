// scripts/gen-schemas-from-registry.ts
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import resourcesDefault from "../src/lib/data/resources/index"; // default export only
import type {
  ResourceConfig,
  ResourceSchemaSpec,
  FieldSpec,
} from "../src/lib/data/types";

// ✅ Widen to unknown/unknown so read-only resources are assignable
const registry: Record<string, ResourceConfig<unknown, unknown>> =
  resourcesDefault as Record<string, ResourceConfig<unknown, unknown>>;

function zFromField(f: FieldSpec): string {
  const base =
    f.type === "uuid" ? "z.string().uuid()" :
    f.type === "text" ? "z.string()" :
    f.type === "bool" ? "z.boolean()" :
    f.type === "int" ? "z.number().int()" :
    f.type === "bigint" ? "z.number()" :
    f.type === "number" ? "z.number()" :
    f.type === "timestamp" ? "z.string()" :
    "z.any()";
  return f.nullable ? `(${base}).nullable()` : base;
}

const header = `// AUTO-GENERATED FROM Registry. DO NOT EDIT.\nimport { z } from "zod";\n\n`;
let body = header;

for (const [key, cfg] of Object.entries(registry)) {
  const schema: ResourceSchemaSpec | undefined = cfg.schema;
  if (!schema?.fields) continue;

  const responseEntries = Object.entries(schema.fields)
    .map(([name, spec]) => `  ${name}: ${zFromField(spec)},`)
    .join("\n");
  body += `export const ${key}Response = z.object({\n${responseEntries}\n});\n`;

  const createEntries = Object.entries(schema.fields)
    .filter(([, s]) => s.write && !s.readonly)
    .map(([name, spec]) => `  ${name}: ${zFromField(spec)},`)
    .join("\n");
  body += `export const ${key}Create = z.object({\n${createEntries}\n});\n`;

  body += `export const ${key}Patch = ${key}Create.partial();\n\n`;
}

body += `
export const ListResponse = <T extends any>(TItem: any) =>
  z.object({ rows: z.array(TItem), total: z.number().int() });

export const SingleResponse = <T extends any>(TItem: any) =>
  z.object({ row: TItem });

export const SuccessResponse = z.object({ success: z.literal(true) });
`;

const outDir = join(process.cwd(), "src", "contracts");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "schemas.generated.ts"), body, "utf-8");
console.log("✅ Wrote src/contracts/schemas.generated.ts");
