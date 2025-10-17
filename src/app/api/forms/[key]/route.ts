// src/app/api/forms/[key]/route.ts
import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { stockAdjustmentCreateConfig } from "@/app/(main)/forms/stock-adjustments/new/form.config";
import { buildSchema } from "@/lib/forms/schema";

// Minimal registry
const formRegistry = {
  [stockAdjustmentCreateConfig.key]: stockAdjustmentCreateConfig,
};

// Minimal permission gate (plug your real one later)
function assertPermission(perms: string[], required: string) {
  if (!perms?.includes(required)) throw new Error(`Forbidden: missing permission ${required}`);
}

export async function POST(req: Request, { params }: { params: { key: string } }) {
  try {
    const config = formRegistry[params.key as keyof typeof formRegistry];
    if (!config) return NextResponse.json({ error: `Unknown form key: ${params.key}` }, { status: 404 });

    // TODO: swap with your real session context
    const session = { userId: "replace-with-real-user-id", permissions: ["resource:user_tally_card_entries:create"] };
    assertPermission(session.permissions, config.permissionKey);

    const body = await req.json();

    // Never trust client user_id
    if ("user_id" in body) delete body.user_id;

    const schema = buildSchema(config as any);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const payload = { ...parsed.data, user_id: session.userId };

    // Plain server client (no cookies). Use SERVICE ROLE key server-side only.
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await supabase.from(config.resource).insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ row: data });
  } catch (err: any) {
    console.error("[forms route] POST error:", err);
    const msg = typeof err?.message === "string" ? err.message : "Unexpected server error";
    const code = msg.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
