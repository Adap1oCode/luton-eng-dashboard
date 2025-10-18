import { NextResponse } from "next/server";

import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: { message: "No IDs provided for deletion" } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Hard delete the selected records
    const { data, error } = await supabase
      .from("tcm_tally_cards")
      .delete()
      .in("id", ids)
      .select("id, tally_card_number");

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${data?.length || 0} tally cards`,
      deletedIds: ids,
    });
  } catch (error) {
    return NextResponse.json({ error: { message: "Failed to delete tally cards" } }, { status: 500 });
  }
}
