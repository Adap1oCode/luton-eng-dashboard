// src/app/api/health/route.ts
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function GET() {
  const cookieStore = await cookies();
  const h = await headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  // 1) Who am I?
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2) Insert a small “ping” row (will succeed only if authenticated & policies allow)
  let insertOk = false,
    insertErr: string | null = null;
  if (user) {
    const { error } = await supabase
      .from("app_health_checks")
      .insert({ who: user.email ?? user.id, note: `ping from ${clientIp(h)}` });
    insertOk = !error;
    insertErr = error?.message ?? null;
  }

  // 3) Count rows (head=true makes it light)
  const { count, error: countErr } = await supabase
    .from("app_health_checks")
    .select("*", { count: "exact", head: true });

  return NextResponse.json(
    {
      ok: !countErr,
      user: user ? { id: user.id, email: user.email } : null,
      inserted: insertOk,
      insertError: insertErr,
      rowCount: count ?? 0,
      message: user ? "Connected. Inserted a health row and counted table." : "Connected. Login to test insert.",
    },
    { status: 200 },
  );
}
