// scripts/gen-schemas-from-registry.ts
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import resourcesDefault from "../src/lib/data/resources/index.ts";
import type {
  ResourceConfig,
  ResourceSchemaSpec,
  FieldSpec,
} from "../src/lib/data/types";

// -------------------- Config knobs (documented in generated header) --------------------
const BIGINT_AS = "number" as "number" | "string"; // set to "string" if you may exceed JS safe integer
const MAX_PAGE_SIZE = 200;

// -------------------- Internals --------------------
const registry: Record<string, ResourceConfig<unknown, unknown>> =
  resourcesDefault as Record<string, ResourceConfig<unknown, unknown>>;

const nowIso = new Date().toISOString();

function esc(str: string) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/"/g, '\\"');
}

function applyStringConstraints(base: string, f: any) {
  // only apply to generic strings/uuids; not to DateTime
  let out = base;
  if (typeof f.length === "number") out += `.length(${f.length})`;
  if (typeof f.min === "number") out += `.min(${f.min})`;
  if (typeof f.max === "number") out += `.max(${f.max})`;
  if (typeof f.pattern === "string") out += `.regex(new RegExp(${JSON.stringify(f.pattern)}))`;
  if (f.format === "email") out += `.email()`;
  if (f.format === "url") out += `.url()`;
  return out;
}

function applyNumberConstraints(base: string, f: any) {
  let out = base;
  if (typeof f.min === "number") out += `.gte(${f.min})`;
  if (typeof f.max === "number") out += `.lte(${f.max})`;
  return out;
}

// Read mapper: mirrors DB → API payloads; use primitives for consistency
function zFromFieldRead(f: FieldSpec): string {
  const anyF = f as any;

  // enum support (strings -> z.enum; numeric/mixed -> union of z.literal)
  if (Array.isArray(anyF.enum) && anyF.enum.length > 0) {
    const allStrings = anyF.enum.every((v: unknown) => typeof v === "string");
    let base = allStrings
      ? `z.enum([${anyF.enum.map((s: string) => JSON.stringify(s)).join(", ")}])`
      : `z.union([${anyF.enum
          .map((v: unknown) =>
            typeof v === "string" ? `z.literal(${JSON.stringify(v)})` : `z.literal(${String(v)})`
          )
          .join(", ")}])`;
    if (anyF.description) base += `.describe("${esc(anyF.description)}")`;
    return f.nullable ? `(${base}).nullable()` : base;
  }

  let base =
    f.type === "uuid" ? "UUID" :
    f.type === "text" ? "z.string()" :
    f.type === "bool" ? "z.boolean()" :
    f.type === "int" ? "Int" :
    f.type === "bigint" ? (BIGINT_AS === "string" ? "z.string()" : "Int") :
    f.type === "number" ? "Numeric" :
    f.type === "timestamp" ? "DateTime" :
    "z.any()";

  if (f.type === "text" || f.type === "uuid") base = applyStringConstraints(base, anyF);
  if (f.type === "int" || f.type === "bigint" || f.type === "number") base = applyNumberConstraints(base, anyF);

  if (anyF.description) base += `.describe("${esc(anyF.description)}")`;
  return f.nullable ? `(${base}).nullable()` : base;
}

// Write mapper: API → DB payloads (DX-friendly coercions via primitives)
function zFromFieldWrite(f: FieldSpec): string {
  const anyF = f as any;

  if (Array.isArray(anyF.enum) && anyF.enum.length > 0) {
    const allStrings = anyF.enum.every((v: unknown) => typeof v === "string");
    let base = allStrings
      ? `z.enum([${anyF.enum.map((s: string) => JSON.stringify(s)).join(", ")}])`
      : `z.union([${anyF.enum
          .map((v: unknown) =>
            typeof v === "string" ? `z.literal(${JSON.stringify(v)})` : `z.literal(${String(v)})`
          )
          .join(", ")}])`;
    if (anyF.description) base += `.describe("${esc(anyF.description)}")`;
    return f.nullable ? `(${base}).nullable()` : base;
  }

  let base =
    f.type === "uuid" ? "UUID" :
    f.type === "text" ? "z.string()" :
    f.type === "bool" ? "z.coerce.boolean()" :
    f.type === "int" ? "Int" :
    f.type === "bigint" ? (BIGINT_AS === "string" ? "z.string()" : "Int") :
    f.type === "number" ? "Numeric" :
    // prefer consistent ISO DateTime on write as well
    f.type === "timestamp" ? "DateTime" :
    "z.any()";

  if (f.type === "text" || f.type === "uuid") base = applyStringConstraints(base, anyF);
  if (f.type === "int" || f.type === "bigint" || f.type === "number") base = applyNumberConstraints(base, anyF);

  if (anyF.description) base += `.describe("${esc(anyF.description)}")`;
  return f.nullable ? `(${base}).nullable()` : base;
}

// -------------------- Emit --------------------
const header = `// AUTO-GENERATED FROM Registry. DO NOT EDIT.
// Generated: ${nowIso}
// Source: scripts/gen-schemas-from-registry.ts
// MAX_PAGE_SIZE: ${MAX_PAGE_SIZE}
// BIGINT_AS: ${BIGINT_AS}

import { z } from "zod";
import { UUID, DateTime, Numeric, Int } from "@/lib/data/primitives";

`;

const common = `export const ListResponse = <T extends z.ZodTypeAny>(TItem: T) =>
  z.object({ rows: z.array(TItem), total: z.number().int() });

export type ListResponseT<T> = { rows: T[]; total: number };

export const SingleResponse = <T extends z.ZodTypeAny>(TItem: T) =>
  z.object({ row: TItem });

export type SingleResponseT<T> = { row: T };

export const SuccessResponse = z.object({ success: z.literal(true) });
export type SuccessResponseT = { success: true };

/** Error helper for consistent failures */
export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  })
});
export type ErrorResponseT = z.infer<typeof ErrorResponse>;

/** Rich list query schema (adds simple, extensible filters) */
const FilterOp = z.union([
  z.literal("eq"),
  z.literal("neq"),
  z.literal("ilike"),
  z.literal("gt"),
  z.literal("gte"),
  z.literal("lt"),
  z.literal("lte"),
  z.literal("in"),
]);

const FilterValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
]);

export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(${MAX_PAGE_SIZE}).optional(),
  q: z.string().optional(),
  activeOnly: z.coerce.boolean().optional(),
  sort: z.object({
    column: z.string(),
    desc: z.coerce.boolean().optional(),
  }).optional(),
  // filters: { field: { op, value } }
  filters: z.record(z.string(), z.object({
    op: FilterOp,
    value: FilterValue
  })).optional(),
}).strict();
export type ListQueryT = z.infer<typeof ListQuery>;

/** Typed helpers (reduce handler boilerplate) */
export function parseListQuery(input: unknown) {
  return ListQuery.parse(input);
}
export function parseListQueryFromURL(url: URL) {
  const entries = Object.fromEntries(url.searchParams.entries());
  return ListQuery.parse(entries);
}
export function parseJSON<T = unknown>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}
export function parseCreate<R extends keyof typeof Schemas>(resource: R, data: unknown) {
  return Schemas[resource].Create.parse(data);
}
export function parsePatch<R extends keyof typeof Schemas>(resource: R, data: unknown) {
  return Schemas[resource].Patch.parse(data);
}

/** Validate sort column against resource allowlist (if provided) */
export function validateSort<R extends keyof typeof Schemas>(
  resource: R,
  sort?: { column: string }
) {
  const meta: any = (Schemas as any)[resource]?.meta;
  const allowed: readonly string[] | undefined = meta?.allowedSort;
  if (sort && allowed && !allowed.includes(sort.column)) {
    throw new Error(\`Invalid sort column '\${sort.column}' for resource '\${String(resource)}'\`);
  }
}

`;

let body = header;

for (const [key, cfg] of Object.entries(registry)) {
  const schema: ResourceSchemaSpec | undefined = (cfg as any).schema;
  if (!schema?.fields) continue;

  // ----- Response (DB → API): include all declared fields -----
  const responseEntries = Object.entries(schema.fields)
    .map(([name, spec]) => `  ${name}: ${zFromFieldRead(spec)},`)
    .join("\n");

  body += `/** ${key}: response (DB → API) */\n`;
  body += `export const ${key}Response = z.object({\n${responseEntries}\n}).strict();\n`;
  body += `export type ${key}ResponseT = z.infer<typeof ${key}Response>;\n\n`;

  // ----- Create (API → DB): include only write && !readonly, optionality via spec.required/defaulted -----
  const createPairs = Object.entries(schema.fields)
    .filter(([, s]) => (s as any).write && !(s as any).readonly);

  const createEntries = createPairs
    .map(([name, spec]) => {
      const base = zFromFieldWrite(spec);
      const anySpec = spec as any;
      const isOptional = anySpec?.required === false || anySpec?.defaulted === true;
      return `  ${name}: ${isOptional ? `${base}.optional()` : base},`;
    })
    .join("\n");

  body += `/** ${key}: create (API → DB) */\n`;
  body += `export const ${key}Create = z.object({\n${createEntries}\n}).strict();\n`;
  body += `export type ${key}CreateT = z.infer<typeof ${key}Create>;\n\n`;

  // ----- Patch (API → DB): partial of create -----
  body += `/** ${key}: patch (API → DB) */\n`;
  body += `export const ${key}Patch = ${key}Create.partial().strict();\n`;
  body += `export type ${key}PatchT = z.infer<typeof ${key}Patch>;\n\n`;
}

// ----- Schemas registry for dynamic lookups -----
// Also emits optional meta.allowedSort if provided on schema (schema.allowedSort or schema.meta.allowedSort)
body += `export const Schemas = {\n`;
for (const [key, cfg] of Object.entries(registry)) {
  const schema: any = (cfg as any).schema;
  if (!schema?.fields) continue;

  // derive allowedSort if present in spec
  const allowedSort: string[] | undefined =
    schema?.allowedSort ?? schema?.meta?.allowedSort;

  if (Array.isArray(allowedSort) && allowedSort.length > 0) {
    body += `  ${key}: { Response: ${key}Response, Create: ${key}Create, Patch: ${key}Patch, meta: { allowedSort: [${allowedSort.map((s: string) => JSON.stringify(s)).join(", ")}] as const } },\n`;
  } else {
    body += `  ${key}: { Response: ${key}Response, Create: ${key}Create, Patch: ${key}Patch },\n`;
  }
}
body += `} as const;\n\n`;

body += common;

// -------------------- Write file --------------------
const outDir = join(process.cwd(), "src", "contracts");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "schemas.generated.ts"), body, "utf-8");
console.log("✅ Wrote src/contracts/schemas.generated.ts");
