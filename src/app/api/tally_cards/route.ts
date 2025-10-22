import { NextResponse } from "next/server";

import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function parseItemNumberToNumeric(item: string): number | null {
  const m = String(item).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

// ✅ GET handler - Fetch tally cards with pagination, sorting, and filtering
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");

    const supabase = await createSupabaseServerClient();

    // Build query
    let query = supabase.from("tcm_tally_cards").select("*", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.or(`tally_card_number.ilike.%${search}%,item_number.ilike.%${search}%,warehouse.ilike.%${search}%`);
    }

    // Apply status filter
    if (status) {
      const isActive = status.toLowerCase() === "active";
      query = query.eq("is_active", isActive);
    }

    // Apply sorting
    const ascending = sortOrder === "asc";
    query = query.order(sortBy, { ascending });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    // Transform data to match UI expectations
    const rows = (data || []).map((row) => ({
      id: row.id,
      tally_card_number: row.tally_card_number,
      item_number: row.item_number,
      warehouse: row.warehouse,
      is_active: row.is_active,
      status: row.is_active ? "Active" : "Inactive",
      note: row.note,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      rows,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching tally cards:", error);
    return NextResponse.json({ error: { message: "Failed to fetch tally cards" } }, { status: 500 });
  }
}

// ✅ POST handler - Create new tally card
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  const { card_uid, warehouse, item_number, quantity, status, owner, notes } = body ?? {};

  if (!card_uid || !warehouse || !item_number) {
    return NextResponse.json(
      { error: { message: "Missing required fields: card_uid, warehouse, item_number" } },
      { status: 400 },
    );
  }

  // Parse item_number early to avoid scope issues
  const numericItem = parseItemNumberToNumeric(item_number);
  if (numericItem === null) {
    return NextResponse.json(
      { error: { message: `item_number must contain digits (got "${item_number}")` } },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  // Resolve warehouse_id based on provided warehouse name/code
  let warehouse_id: string | null = null;

  const { data: wh, error: whErr } = await supabase
    .from("warehouses")
    .select("id, name, code")
    .or(`name.eq.${warehouse},code.eq.${warehouse}`)
    .maybeSingle();

  if (whErr) {
    return NextResponse.json({ error: { message: whErr.message } }, { status: 400 });
  }

  if (!wh) {
    return NextResponse.json({ error: { message: `Unknown warehouse "${warehouse}"` } }, { status: 400 });
  }

  warehouse_id = wh.id;

  // ✅ احفظ الـ warehouse كـ code علشان الـ FK
  const insertPayload = {
    tally_card_number: String(card_uid).trim(),
    warehouse_id,
    warehouse: wh.code ?? null, // ← مهم: نخزن code وليس قيمة الريكويست
    item_number: numericItem,
    note: notes ?? null,
    is_active: status ? String(status).toLowerCase() !== "inactive" : true,
  };

  const { data, error } = await supabase
    .from("tcm_tally_cards")
    .insert(insertPayload)
    .select("id, tally_card_number, warehouse, item_number, note, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: { message: "Failed to create tally card" } }, { status: 500 });
  }

  return NextResponse.json(
    {
      row: {
        id: data.id,
        card_uid: data.tally_card_number,
        warehouse: warehouse, // ← رجّع نفس قيمة الريكويست للمستخدم
        item_number: item_number,
        quantity: quantity ?? null,
        status: status ?? (data.is_active ? "active" : "inactive"),
        owner: owner ?? null,
        notes: data.note ?? null,
        created_at: data.created_at,
        updated_at: null,
      },
    },
    { status: 200 },
  );
}
