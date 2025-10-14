// src/app/api/me/role/route.ts
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/server/user-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const role = await getCurrentUserRole();

  // If unauthenticated or no public.users row yet, return 401 with a hint
  if (!role) {
    return NextResponse.json(
      { error: "not_authenticated_or_no_user_row" },
      { status: 401 }
    );
  }

  return NextResponse.json(role, { status: 200 });
}
