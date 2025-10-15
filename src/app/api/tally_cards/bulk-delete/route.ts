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

    // Soft delete by setting is_active to false
    const updateData: any = {
      is_active: false,
    };

    // Only add updated_at if the table has this column
    // For tcm_tally_cards, we don't have updated_at, so we skip it
    // updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tcm_tally_cards")
      .update(updateData)
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
