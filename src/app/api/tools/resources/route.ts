// -----------------------------------------------------------------------------
// FILE: src/app/api/tools/resources/route.ts
// TYPE: Next.js App Router API (GET)
// PURPOSE: List available resources for the generator UI (dev-only friendly)
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import resources from "@/lib/data/resources";

export const dynamic = "force-dynamic";

export async function GET() {
  const keys = Object.keys(resources || {}).sort();
  return NextResponse.json({ resources: keys });
}


