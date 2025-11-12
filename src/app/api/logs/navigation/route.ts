// API endpoint to receive navigation logs from client
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/obs/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const log = logger.child({ evt: 'navigation' });
    log.info({
      route: body.route,
      duration_ms: body.duration_ms,
      from_route: body.from_route,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Don't fail if logging fails
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

