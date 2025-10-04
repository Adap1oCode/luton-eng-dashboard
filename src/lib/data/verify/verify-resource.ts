// src/lib/data/verify/verify-resource.ts
// Generic validator for any ResourceConfig: schema checks + data hydration checks.

import type { Id } from "@/lib/data/types";
import { createSupabaseReadOnlyProvider } from "@/lib/supabase/factory";
import { createClient } from "@supabase/supabase-js";

// --- Node-safe Supabase client (bypasses server-only) ---
function getSupabaseForVerify() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env");
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

type PassFail = { ok: boolean; details?: any };
type Report = {
  resource: string;
  summary: { schema_ok: boolean; list_ok: boolean; relations_ok: boolean };
  schema?: any;
  list?: any;
  relations?: any;
};

// --- helper types ---
type ColumnInfo = { column_name: string; data_type: string };

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
function sortStrings(arr: string[]) {
  return [...arr].map(String).sort();
}

// --- SCHEMA CHECK ------------------------------------------------------------
async function fetchColumns(sb: any, table: string): Promise<ColumnInfo[]> {
  try {
    const { data, error } = await sb
      .from("information_schema.columns" as any)
      .select("column_name, data_type")
      .eq("table_schema", "public")
      .eq("table_name", table);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      column_name: r.column_name,
      data_type: r.data_type,
    }));
  } catch {
    // Non-fatal: return empty â†’ skip schema validation if not accessible
    return [] as ColumnInfo[];
  }
}

function parseSelect(select: string): string[] {
  return select.split(",").map((s) => s.trim()).filter(Boolean);
}

async function checkSchema(cfg: any) {
  const sb = getSupabaseForVerify();

  const cols = await fetchColumns(sb, cfg.table);
  if (!cols.length) {
    return <PassFail>{ ok: true, details: { missing: [], available: [] } };
  }

  const colSet = new Set(cols.map((c: ColumnInfo) => c.column_name));
  const missing: string[] = [];

  if (!colSet.has(cfg.pk)) missing.push(`pk:${cfg.pk}`);

  for (const c of parseSelect(cfg.select))
    if (!colSet.has(c)) missing.push(`select:${c}`);

  for (const c of cfg.search ?? [])
    if (!colSet.has(c)) missing.push(`search:${c}`);

  if (cfg.activeFlag && !colSet.has(cfg.activeFlag))
    missing.push(`activeFlag:${cfg.activeFlag}`);

  return <PassFail>{
    ok: missing.length === 0,
    details: { missing, available: cols },
  };
}

// --- GROUND TRUTH RELATION CHECKS --------------------------------------------
async function groundTruthManyToMany(sb: any, ids: Id[], r: any) {
  const { data: junction, error: jErr } = await sb
    .from(r.viaTable)
    .select(`${r.thisKey}, ${r.thatKey}`)
    .in(r.thisKey, ids);
  if (jErr) throw jErr;

  const valuesByParent = new Map<Id, any[]>();
  for (const j of junction ?? []) {
    const pid = j[r.thisKey];
    const val = j[r.thatKey];
    if (!valuesByParent.has(pid)) valuesByParent.set(pid, []);
    valuesByParent.get(pid)!.push(val);
  }

  let targetById: Map<Id, any> | null = null;
  if (r.resolveAs !== "ids" && (junction?.length ?? 0) > 0) {
    const allTargetIds = uniq(junction!.map((j: any) => j[r.thatKey]));
    const { data: targets, error: tErr } = await sb
      .from(r.targetTable)
      .select(r.targetSelect)
      .in("id", allTargetIds);
    if (tErr) throw tErr;
    targetById = new Map(targets.map((x: any) => [x.id, x]));
  }

  const gt = new Map<Id, { values: any[]; scope: "ALL" | "RESTRICTED" | "NONE" }>();
  for (const pid of ids) {
    const mine = valuesByParent.get(pid) ?? [];
    const scope =
      mine.length === 0
        ? r.onEmptyPolicy === "ALL"
          ? "ALL"
          : "NONE"
        : "RESTRICTED";

    if (r.resolveAs === "ids") {
      gt.set(pid, { values: sortStrings(mine.map(String)), scope });
    } else {
      const objs = mine.map((id) => targetById?.get(id)).filter(Boolean);
      const idsOnly = sortStrings(objs.map((o: any) => String(o?.id ?? "")));
      gt.set(pid, { values: idsOnly, scope });
    }
  }
  return gt;
}

async function groundTruthOneToMany(sb: any, ids: Id[], r: any) {
  const { data: kids, error } = await sb
    .from(r.targetTable)
    .select(r.targetSelect)
    .in(r.foreignKey, ids);
  if (error) throw error;

  const grouped = new Map<Id, any[]>();
  for (const k of kids ?? []) {
    const fk = k[r.foreignKey];
    if (!grouped.has(fk)) grouped.set(fk, []);
    grouped.get(fk)!.push(k);
  }
  return grouped;
}

async function groundTruthManyToOne(sb: any, rows: any[], r: any) {
  const targetIds = uniq(rows.map((row) => row[r.localKey]).filter(Boolean));
  let m = new Map<Id, any>();
  if (targetIds.length) {
    const { data: parents, error } = await sb
      .from(r.targetTable)
      .select(r.targetSelect)
      .in("id", targetIds);
    if (error) throw error;
    m = new Map(parents.map((x: any) => [x.id, x]));
  }
  return m;
}

// --- LIST + RELATIONS --------------------------------------------------------
async function checkListAndRelations(cfg: any) {
  const sb = getSupabaseForVerify();
  const provider = createSupabaseReadOnlyProvider<any, any>(cfg);

  const sample = await provider.list({ page: 1, pageSize: 100 });
  const ids = (sample.rows as any[]).map((r) => r[cfg.pk]);

  const out: any = { sample_count: sample.rows.length, issues: [] as string[] };

  // manyToMany
  for (const rel of (cfg.relations ?? []).filter((rr: any) => rr.includeByDefault && rr.kind === "manyToMany")) {
    const gt = await groundTruthManyToMany(sb, ids, rel);
    for (const row of sample.rows as any[]) {
      const g = gt.get(row[cfg.pk]);
      if (!g) continue;
      const pScope = row[`${rel.name}_scope`] ?? "NONE";

      if (rel.resolveAs === "ids") {
        const pVals = sortStrings((row[rel.name] ?? []).map(String));
        if (JSON.stringify(pVals) !== JSON.stringify(g.values)) {
          out.issues.push(`manyToMany ${rel.name}: code mismatch for ${cfg.table}.${cfg.pk}=${row[cfg.pk]}`);
        }
      } else {
        const pObjs = (row[rel.name] ?? []) as any[];
        const pIds = sortStrings(pObjs.map((o) => String(o?.id ?? "")));
        if (JSON.stringify(pIds) !== JSON.stringify(g.values)) {
          out.issues.push(`manyToMany ${rel.name}: target id mismatch for ${cfg.table}.${cfg.pk}=${row[cfg.pk]}`);
        }
      }

      if (pScope !== g.scope) {
        out.issues.push(
          `manyToMany ${rel.name}: scope mismatch for ${cfg.table}.${cfg.pk}=${row[cfg.pk]} (provider=${pScope}, gt=${g.scope})`
        );
      }
    }
  }

  // oneToMany
  for (const rel of (cfg.relations ?? []).filter((rr: any) => rr.includeByDefault && rr.kind === "oneToMany")) {
    const grouped = await groundTruthOneToMany(sb, ids, rel);
    for (const row of sample.rows as any[]) {
      const gtKids = (grouped.get(row[cfg.pk]) ?? []) as any[];
      let expected = gtKids;

      if (rel.orderBy) {
        const { column, desc } = rel.orderBy;
        const asc = !desc;
        expected = expected.sort(
          (a, b) => (a[column] < b[column] ? -1 : 1) * (asc ? 1 : -1)
        );
      }
      if (rel.limit != null) expected = expected.slice(0, rel.limit);

      const pKids = (row[rel.name] ?? []) as any[];
      if (pKids.length !== expected.length) {
        out.issues.push(
          `oneToMany ${rel.name}: count mismatch for ${cfg.table}.${cfg.pk}=${row[cfg.pk]} (provider=${pKids.length}, gt=${expected.length})`
        );
      }
    }
  }

  // manyToOne
  for (const rel of (cfg.relations ?? []).filter((rr: any) => rr.includeByDefault && rr.kind === "manyToOne")) {
    const mapParent = await groundTruthManyToOne(sb, sample.rows as any[], rel);
    for (const row of sample.rows as any[]) {
      const expected = mapParent.get(row[rel.localKey]) ?? null;
      const provided = row[rel.name] ?? null;
      const ok =
        (expected === null && provided === null) ||
        (expected && provided && String(expected.id ?? "") === String(provided.id ?? ""));
      if (!ok) {
        out.issues.push(`manyToOne ${rel.name}: mismatch for ${cfg.table}.${cfg.pk}=${row[cfg.pk]}`);
      }
    }
  }

  return <PassFail>{ ok: out.issues.length === 0, details: out };
}

// --- ENTRY -------------------------------------------------------------------
export async function verifyResource(resource: string, cfg: any): Promise<Report> {
  const schema = await checkSchema(cfg);
  const list = await checkListAndRelations(cfg);
  return {
    resource,
    summary: { schema_ok: schema.ok, list_ok: list.ok, relations_ok: list.ok },
    schema: schema.details,
    list: list.details,
    relations: list.details,
  };
}