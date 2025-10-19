import { logBase } from "./logger";
import { withRequestContext } from "./request-context";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export function withLogging(
  handler: (req: NextRequest, params?: any) => Promise<Response | NextResponse>
) {
  return async (req: NextRequest, ctx?: any) => {
    const started = Date.now();
    const request_id = req.headers.get("x-request-id") ?? randomUUID();
    const route = req.nextUrl.pathname.replace(/\b([0-9a-f-]{6,})\b/g, ":id"); // normalize ids
    const method = req.method;

    return withRequestContext({ request_id, route, method }, async () => {
      const log = logBase({ request_id, route, method, env: process.env.NODE_ENV ?? "dev" });
      log.info({ evt: "request", query: Object.fromEntries(req.nextUrl.searchParams) });

      try {
        const res = await handler(req, ctx);
        const duration_ms = Date.now() - started;
        log.info({ evt: "response", status: res.status, duration_ms });
        return res;
      } catch (err: any) {
        const duration_ms = Date.now() - started;
        const error_message = String(err?.message ?? err);
        const status = 500;
        log.error({ evt: "error", status, duration_ms, error_message, error_code: err?.code });
        return NextResponse.json(
          { error: { message: "Internal error", request_id } },
          { status }
        );
      }
    });
  };
}
