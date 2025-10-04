// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// PURPOSE: "View All Tally Cards" screen using the above config
// ASSUMPTIONS:
//  • A generic DataTable component exists at @/components/data-table/data-table
//    with signature like: <DataTable columns={cols} data={rows} ... />
//  • If your path or props differ, adjust the import/props as needed.
//  • Supabase table name: tcm_tally_cards
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { DataTable } from "@/components/data-table/data-table"; // Adjust if your base table path differs

import {
  tallyCardsViewConfig,
  type TallyCardRow,
} from "@/app/(main)/forms/tally_cards/_data/config";

// Fetcher (client-side; SSR variant could be added later if preferred)
async function fetchTallyCards(): Promise<TallyCardRow[]> {
  const sb = supabaseBrowser();
  const { data, error } = await sb
    .from("tcm_tally_cards")
    .select("id, tally_card_number, warehouse, item_number, note, is_active, created_at, updated_at")
    .order("tally_card_number", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    tally_card_number: String(r.tally_card_number ?? "").trim(),
    warehouse: String(r.warehouse ?? "").trim(),
    item_number: String(r.item_number ?? "").trim(),
    note: r.note ?? null,
    is_active: Boolean(r.is_active),
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }));
}

export default function TallyCardsViewPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TallyCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // simple local filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTallyCards()
      .then((data) => {
        if (!mounted) return;
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch tally cards failed", err);
        setError(err?.message ?? "Failed to load tally cards");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Derived data according to quick filters + global search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;

    if (statusFilter !== "ALL") {
      const wantActive = statusFilter === "ACTIVE";
      list = list.filter((r) => r.is_active === wantActive);
    }

    if (q) {
      list = list.filter((r) =>
        r.tally_card_number.toLowerCase().includes(q) ||
        r.warehouse.toLowerCase().includes(q) ||
        r.item_number.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, query, statusFilter]);

  // Build columns (includes actions column with data-action-id / data-row-id)
  const columns = useMemo(() => tallyCardsViewConfig.buildColumns(true), []);

  // Toolbar handlers mapping
  const handleToolbarClick = useCallback(async (id: string) => {
    if (id === "exportCsv") {
      if (!filtered.length) {
        toast.info("No rows to export");
        return;
      }
      const headers = [
        "Tally Card",
        "Warehouse",
        "Item Number",
        "Active",
        "Updated",
      ];
      const csvRows = filtered.map((r) => [
        r.tally_card_number,
        r.warehouse,
        r.item_number,
        r.is_active ? "Active" : "Inactive",
        r.updated_at ?? "",
      ]);
      const csv = [headers, ...csvRows]
        .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tally_cards_${new Date().toISOString().slice(0,16).replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  }, [filtered]);

  // Row action delegation (listens for clicks on items with data-action-id)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const item = target.closest<HTMLElement>("[data-action-id]");
      if (!item) return;
      const actionId = item.dataset.actionId as string | undefined;
      const rowId = item.dataset.rowId as string | undefined;
      if (!actionId || !rowId) return;

      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      if (actionId === "view") {
        router.push(`/forms/tally_cards/${rowId}`);
        return;
      }
      if (actionId === "edit") {
        router.push(`/forms/tally_cards/${rowId}/edit`);
        return;
      }
      if (actionId === "delete") {
        const ok = window.confirm(`Delete tally card ${row.tally_card_number}?`);
        if (!ok) return;
        const sb = supabaseBrowser();
        const { error } = await sb.from("tcm_tally_cards").delete().eq("id", rowId);
        if (error) {
          toast.error(error.message ?? "Delete failed");
          return;
        }
        setRows((prev) => prev.filter((r) => r.id !== rowId));
        toast.success("Tally card deleted");
        return;
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [rows, router]);

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Tally Cards</h1>
          <Badge variant="outline" className="ml-1">{rows.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Global search */}
          {tallyCardsViewConfig.features.globalSearch && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 w-64"
                placeholder="Search tally cards..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}

          {/* Toolbar right buttons */}
          {tallyCardsViewConfig.toolbar.right?.map((btn) => (
            btn.href ? (
              <Button key={btn.id} variant={btn.variant ?? "default"} asChild>
                <a href={btn.href}>
                  {btn.icon ? <btn.icon className="mr-2 h-4 w-4" /> : null}
                  {btn.label}
                </a>
              </Button>
            ) : (
              <Button key={btn.id} variant={btn.variant ?? "default"} onClick={() => btn.onClickId && handleToolbarClick(btn.onClickId!)}>
                {btn.icon ? <btn.icon className="mr-2 h-4 w-4" /> : null}
                {btn.label}
              </Button>
            )
          ))}
        </div>
      </div>

      {/* Quick filter: Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          {[
            { v: "ALL", label: "All" },
            { v: "ACTIVE", label: "Active" },
            { v: "INACTIVE", label: "Inactive" },
          ].map((o) => (
            <Button
              key={o.v}
              size="sm"
              variant={statusFilter === (o.v as any) ? "default" : "outline"}
              onClick={() => setStatusFilter(o.v as any)}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tally cards…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            // If your DataTable supports these props, pass-through; otherwise safe to ignore
            enableSorting={tallyCardsViewConfig.features.sortable}
            enableRowSelection={tallyCardsViewConfig.features.rowSelection}
            enablePagination={tallyCardsViewConfig.features.pagination}
            viewStorageKey={tallyCardsViewConfig.features.viewStorageKey}
          />
        )}
      </div>
    </div>
  );
}
