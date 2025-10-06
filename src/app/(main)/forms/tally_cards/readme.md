Tally Card Manager — Context & Goals

Business context: Operations keep physical Tally Cards to record inbound/outbound quantities. Accuracy is mixed: sometimes the cards are right, sometimes the IMS (inventory management system) is.

Purpose of the app: Provide a fast, reliable way to view, validate, and reconcile Tally Card data against IMS data. The app is an additional control—not a replacement.

Strategic goals:

Ship screens quickly (config-first, reuse everywhere).

Keep data access provider-agnostic (Supabase today, swappable tomorrow).

Prefer server fetching (SSR/API) with a small client shell for interactivity.

Lean on shadcn/ui and TanStack Table for consistent UX and zero bespoke table logic.

Architecture — Principles (the rails we won’t break)

API-first pages: every screen reads via a Next.js API route (server) or SSR loader; browser calls the API—not the DB.

Stable response shape: { rows: [...] } (add { total } later). Same across all resources.

Single shared table system: one generic DataTable renderer (TanStack), fed by per-screen config files (no forks).

Provider abstraction: API route uses a data provider (Supabase REST/Server client today). We can swap providers behind the API without touching screens.

No-store by default: avoid hydration drift and stale HTML.

Config over code: columns, features, and toolbar are defined in each screen’s config.tsx.

UX conventions: left sticky expander column for row details; optional checkbox selection; pagination & resize persisted per view.

“View Tally Cards” — Current Working Pattern
Files that matter (and what they do)

Forms / Tally Cards

src/app/(main)/forms/tally_cards/page.tsx — Client screen. Fetches via API (falls back to browser Supabase if API fails), builds TanStack table, persists column state, renders the generic table.

src/app/(main)/forms/tally_cards/config.tsx — Declares columns + features (no logic).

src/app/(main)/forms/tally_cards/sections/shell-client.tsx — Page shell (title, toolbar, slots).

Data Table (shared)

src/components/data-table/data-table.tsx — Generic TanStack renderer (headers, sticky, resize, expansion row).

src/components/data-table/data-table-column-header.tsx — Sort/filter header UI.

src/components/data-table/data-table-pagination.tsx — Pagination bar.

src/components/data-table/data-table-expander-cell.tsx — Chevron (expand) and optional checkbox cell.

API & Data

src/app/api/tally_cards/route.ts — GET /api/tally_cards?page&pagesize → returns { rows } via Supabase (REST or server client), Cache-Control: no-store.

src/lib/supabase.ts — Browser client (used only as fallback).

src/lib/supabase-server.ts — Server client for API/SSR.

Legacy in forms/tally_cards/_data/** (projection/binding), sections/shell.tsx, projection.ts — not referenced by the View All screen; safe to archive unless another route uses them.

Data-flow (today)

Page fetch → fetch('/api/tally_cards?...', { cache: 'no-store' }).

If API returns non-200/invalid → fallback to supabaseBrowser() select.

Rows flow into the shared DataTable.

Column order/visibility/sizing persist to localStorage (per-view key).

The Pattern to Reuse (for every new “View All” screen)
1) API Route (server, no-store)

Create src/app/api/<resource>/route.ts:

Accept page, pageSize, later q / filters.

Use Supabase server client (or compose a PostgREST URL).

Return { rows } (and { total } when needed).

Set no-store.

Minimal template

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 200);
  const from = (page - 1) * pageSize, to = from + pageSize - 1;

  const sb = createServerClient();
  const { data, error } = await sb
    .from("<table>")
    .select("id,col1,col2,...")
    .order("<defaultSort>", { ascending: true })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] }, { headers: { "Cache-Control": "no-store" }});
}

2) Page (two variants)

A) Current (Client) — fastest to replicate now

In page.tsx, call the API; fallback to browser Supabase.

Build table from config.tsx and render DataTable.

B) Recommended (SSR) — the pattern we’ll standardize on

Make page.tsx a Server Component: fetch rows from the API (or server client) and pass them to a thin client wrapper.

Client wrapper renders the exact same DataTable UI.

SSR template

// page.tsx (SERVER)
import Client from "./client";
export default async function Page() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/<resource>?page=1&pageSize=200`, { cache: "no-store" });
  const { rows = [] } = await res.json();
  return <Client initialRows={rows} />;
}

// client.tsx (CLIENT)
"use client";
import * as React from "react";
import type { RowType } from "./config";
import { DataTable as BaseDataTable } from "@/components/data-table/data-table";
// … build columns from config, hydrate TanStack, render BaseDataTable
export default function Client({ initialRows }: { initialRows: RowType[] }) {
  const [rows] = React.useState(initialRows);
  // render existing table UI (no fetch effect needed)
  return <BaseDataTable /* table={...} */ />;
}

3) Config

Create src/app/(main)/forms/<resource>/config.tsx:

Column defs (accessor, header via DataTableColumnHeader, cell).

Optional features/toolbar overrides.

No data fetching in config.

4) Shell

Reuse sections/shell-client.tsx for consistent chrome (title, toolbar, chips).

Why this scales (and swaps providers easily)

API shield: Screens depend on API responses, not on a specific DB client. We can replace Supabase with another provider (or a microservice) behind the same route with zero page changes.

Shared table engine: TanStack + shadcn/ui give a consistent, accessible table with expanders, resize, pinning—no per-screen table code.

SSR-ready: Server data by default means less hydration drift, better performance, and easier auth.

Config-driven columns: Adding a screen is mainly a matter of writing config.tsx and one API route.

Do / Don’t (guardrails)

Do fetch on server (API/SSR) with no-store.

Do keep API output shape stable ({ rows }).

Do share table components; don’t fork them.

Don’t couple pages to a vendor SDK in the browser—use it only as a fallback (or not at all once SSR is the norm).

Don’t put business logic in components—keep it in API/data layer.

What’s next (to make View Tally Cards the gold standard)

Flip to SSR using the template above (no UI change).

Delete legacy _data/**, projection.ts, sections/shell.tsx after confirming no other routes import them.

Optional: move fallback browser Supabase out (once SSR is in place) to enforce “API-only” reads.

Add { total } to API responses when we need server-side pagination.

Introduce a tiny data-provider interface in the API route folder (so swapping Supabase → other provider is one file change).

Keep this as the quick reference. When we start the next screen, we’ll copy this pattern verbatim: API route → (SSR) Page → Client wrapper → Config → Shared DataTable.