import { NextResponse } from "next/server";

import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const selectedIds = url.searchParams.get("ids");

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("tcm_tally_cards")
      .select("id, tally_card_number, item_number, warehouse, note, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("tally_card_number", { ascending: true });

    // If specific IDs are provided, filter by them
    if (selectedIds) {
      const ids = selectedIds.split(",").filter(Boolean);
      if (ids.length > 0) {
        query = query.in("id", ids);
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    // Convert to CSV
    const csvHeaders = [
      "ID",
      "Tally Card Number",
      "Item Number",
      "Warehouse",
      "Note",
      "Status",
      "Created At",
      "Updated At",
    ];

    const csvRows =
      data?.map((row) => [
        row.id,
        row.tally_card_number,
        row.item_number,
        row.warehouse,
        row.note || "",
        row.is_active ? "Active" : "Inactive",
        row.created_at,
        row.updated_at,
      ]) || [];

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) =>
        row
          .map((field) => (typeof field === "string" && field.includes(",") ? `"${field.replace(/"/g, '""')}"` : field))
          .join(","),
      ),
    ].join("\n");

    const filename = `tally_cards_export_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: { message: "Failed to export tally cards" } }, { status: 500 });
  }
}
