// scripts/gen-openapi-from-registry.ts
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import resourcesDefault from "../src/lib/data/resources/index.ts";
import type {
  ResourceConfig,
  ResourceSchemaSpec,
  FieldSpec,
} from "../src/lib/data/types";

type AnyConfig = ResourceConfig<unknown, unknown> & {
  // Optional examples you can add per resource config
  examples?: {
    response?: Record<string, unknown>;
    create?: Record<string, unknown>;
    patch?: Record<string, unknown>;
  };
  // Optional description for nicer docs
  description?: string;
};

const registry = resourcesDefault as Record<string, AnyConfig>;

function openApiTypeForField(f: FieldSpec): { type?: string; format?: string } {
  switch (f.type) {
    case "uuid": return { type: "string", format: "uuid" };
    case "text": return { type: "string" };
    case "bool": return { type: "boolean" };
    case "int": return { type: "integer" };
    case "bigint": return { type: "integer" }; // You can switch this to string if you exceed JS safe range
    case "number": return { type: "number" };
    case "timestamp": return { type: "string", format: "date-time" };
    default: return {}; // unknown -> free form
  }
}

function jsonSchemaFromField(name: string, f: FieldSpec) {
  const base = openApiTypeForField(f);
  const schema: any = { ...base };


  // Optional constraints passthrough
  if ((f as any).enum) schema.enum = (f as any).enum;
  if ((f as any).min !== undefined) schema.minimum = (f as any).min;
  if ((f as any).max !== undefined) schema.maximum = (f as any).max;
  if ((f as any).pattern) schema.pattern = (f as any).pattern;
  if ((f as any).description) schema.description = (f as any).description;
  if ((f as any).format) schema.format = (f as any).format; // override default if provided
  if ((f as any).example !== undefined) schema.example = (f as any).example;

  if (f.nullable) {
    return { anyOf: [schema, { type: "null" }] };
  }
  return schema;
}

function buildObjectSchema(
  fields: Record<string, FieldSpec>,
  predicate: (f: FieldSpec, name: string) => boolean
) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [name, spec] of Object.entries(fields)) {
    if (!predicate(spec, name)) continue;
    properties[name] = jsonSchemaFromField(name, spec);
    // Required rule: if nullable is false and write is true for create
    // For response we mark nothing required to keep compatibility unless you prefer stricter
  }
  return { type: "object", properties, additionalProperties: false };
}

function synthesizeExample(fields: Record<string, FieldSpec>) {
  const ex: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(fields)) {
    if (f.nullable) { ex[k] = null; continue; }
    switch (f.type) {
      case "uuid": ex[k] = "00000000-0000-0000-0000-000000000000"; break;
      case "text": ex[k] = `${k}_value`; break;
      case "bool": ex[k] = false; break;
      case "int": ex[k] = 1; break;
      case "bigint": ex[k] = 9007199254740991; break;
      case "number": ex[k] = 1.23; break;
      case "timestamp": ex[k] = "2025-01-01T00:00:00Z"; break;
      default: ex[k] = null;
    }
  }
  return ex;
}

function asComponentName(resourceKey: string, suffix: "Response" | "Create" | "Patch") {
  // keep it simple and predictable
  return `${resourceKey}_${suffix}`;
}

type OpenAPI = {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers: { url: string; description?: string }[];
  paths: Record<string, any>;
  components: { schemas: Record<string, any> };
};

const openapi: OpenAPI = {
  openapi: "3.1.0",
  info: {
    title: "Tally Card Manager API",
    version: "1.0.0",
    description:
      "API contract generated from the resource registry. All list endpoints return { rows, total }",
  },
  servers: [
    { url: "http://localhost:3000", description: "Local dev" },
  ],
  paths: {},
  components: { schemas: {} },
};

// Shared wrappers
openapi.components.schemas.ListResponse = {
  type: "object",
  properties: {
    rows: { type: "array", items: {} }, // will be inlined per path with $ref
    total: { type: "integer" },
  },
  required: ["rows", "total"],
  additionalProperties: false,
};

openapi.components.schemas.SingleResponse = {
  type: "object",
  properties: {
    row: {},
  },
  required: ["row"],
  additionalProperties: false,
};

openapi.components.schemas.SuccessResponse = {
  type: "object",
  properties: { success: { const: true, type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
};

for (const [key, cfg] of Object.entries(registry)) {
  const schema: ResourceSchemaSpec | undefined = cfg.schema;
  if (!schema?.fields) continue;

  const pk = cfg.pk || "id";
  const description = cfg.description ?? `Operations for ${key}`;
  const fields = schema.fields;

  // Components
  const responseName = asComponentName(key, "Response");
  const createName = asComponentName(key, "Create");
  const patchName = asComponentName(key, "Patch");

  const responseSchema = buildObjectSchema(fields, () => true);
  const createSchema = buildObjectSchema(fields, (f, n) => !!f.write && !f.readonly);
  const patchSchema = {
    ...createSchema,
    required: [],
  };

  // Attach generated examples if provided or synthesize
  const examples = cfg.examples ?? {};
  const exampleResponse = examples.response ?? synthesizeExample(fields);
  const exampleCreate = examples.create ??
    Object.fromEntries(
      Object.entries(fields)
        .filter(([, f]) => f.write && !f.readonly)
        .map(([k, f]) => [k, (synthesizeExample({ [k]: f }) as any)[k]])
    );
  const examplePatch = examples.patch ?? exampleCreate;

openapi.components.schemas[responseName] = {
  ...responseSchema,
  example: exampleResponse,
};
openapi.components.schemas[createName] = {
  ...createSchema,
  example: exampleCreate,
};
openapi.components.schemas[patchName] = {
  ...patchSchema,
  example: examplePatch,
};


  // Paths
  // Collection
  openapi.paths[`/api/${key}`] = {
    get: {
      tags: [key],
      summary: `List ${key}`,
      description,
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", minimum: 1 }, required: false },
        { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1 }, required: false },
        // Future: q, filters
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ListResponse" },
                  {
                    type: "object",
                    properties: {
                      rows: {
                        type: "array",
                        items: { $ref: `#/components/schemas/${responseName}` },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      tags: [key],
      summary: `Create ${key}`,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${createName}` },
            example: exampleCreate,
          },
        },
      },
      responses: {
        "201": {
          description: "Created",
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${responseName}` },
              example: exampleResponse,
            },
          },
        },
      },
    },
  };

  // Item
  openapi.paths[`/api/${key}/{id}`] = {
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: openApiTypeForField(fields[pk] ?? { type: "text", nullable: false, write: false, readonly: false }),
        description: `${pk} of the ${key} record`,
      },
    ],
    get: {
      tags: [key],
      summary: `Get ${key} by id`,
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SingleResponse" },
                  { type: "object", properties: { row: { $ref: `#/components/schemas/${responseName}` } } },
                ],
              },
              example: { row: exampleResponse },
            },
          },
        },
        "404": { description: "Not found" },
      },
    },
    patch: {
      tags: [key],
      summary: `Update ${key} by id`,
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: `#/components/schemas/${patchName}` }, example: examplePatch } },
      },
      responses: {
        "200": {
          description: "OK",
          content: { "application/json": { schema: { $ref: `#/components/schemas/${responseName}` }, example: exampleResponse } },
        },
        "404": { description: "Not found" },
      },
    },
    delete: {
      tags: [key],
      summary: `Delete ${key} by id`,
      responses: {
        "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
        "404": { description: "Not found" },
      },
    },
  };
}

// Write to public so it is easy to serve
const outDir = join(process.cwd(), "public");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "openapi.json");
writeFileSync(outPath, JSON.stringify(openapi, null, 2), "utf-8");
console.log(`✅ Wrote ${outPath}`);
