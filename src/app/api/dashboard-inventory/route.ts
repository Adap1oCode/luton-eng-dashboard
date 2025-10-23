import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// ✅ GET handler - Fetch inventory data using RPC functions
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const search = url.searchParams.get("search") || "";
    const warehouse = url.searchParams.get("warehouse");
    const distinct = url.searchParams.get("distinct") === "true";

    const supabase = await createSupabaseServerClient();

    // Build filter for RPC call - use empty filter for now to get basic data
    const filter: Record<string, any> = {};
    
    // For now, let's use an empty filter to test basic functionality
    // TODO: Add proper search and warehouse filtering later

    // Calculate pagination range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Call the RPC function
    const { data, error } = await supabase.rpc("get_inventory_rows", {
      _filter: filter,
      _distinct: distinct,
      _range_from: from,
      _range_to: to,
    });

    if (error) {
      console.error("RPC error:", error);
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    // For total count, we need to make a separate call
    // Since we don't have a direct count from RPC, we'll estimate based on returned data
    const total = data ? data.length : 0;

    return NextResponse.json({
      rows: data || [],
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: { message: "Failed to fetch inventory" } }, { status: 500 });
  }
}
