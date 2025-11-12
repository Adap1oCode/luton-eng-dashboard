// API endpoint to receive user action logs from client
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/obs/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const log = logger.child({ evt: 'user_action' });
    log.info({
      action: body.action,
      route: body.route,
      click_time: body.click_time,
      duration_ms: body.duration_ms,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Don't fail if logging fails
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

