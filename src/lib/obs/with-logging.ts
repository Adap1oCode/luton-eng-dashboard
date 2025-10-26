import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { logBase } from "./logger";
import { withRequestContext } from "./request-context";

// Helper to categorize errors for better monitoring
function categorizeError(err: any): { category: string; severity: "low" | "medium" | "high" } {
  const message = String(err?.message ?? err).toLowerCase();
  
  // Database/Infrastructure errors
  if (/connection|timeout|database|postgres|supabase/i.test(message)) {
    return { category: "infrastructure", severity: "high" };
  }
  
  // Authentication/Authorization errors
  if (/auth|permission|unauthorized|forbidden|rls|policy/i.test(message)) {
    return { category: "auth", severity: "medium" };
  }
  
  // Validation errors
  if (/invalid|validation|bad request|required|format/i.test(message)) {
    return { category: "validation", severity: "low" };
  }
  
  // Business logic errors
  if (/not found|unknown resource|no config/i.test(message)) {
    return { category: "business", severity: "low" };
  }
  
  // Default to high severity for unknown errors
  return { category: "unknown", severity: "high" };
}

export function withLogging(handler: (req: NextRequest, params?: any) => Promise<Response | NextResponse>) {
  return async (req: NextRequest, ctx?: any) => {
    const started = Date.now();
    const request_id = req.headers.get("x-request-id") ?? randomUUID();
    
    // Handle both NextRequest and regular Request objects (for tests)
    const pathname = (req as any).nextUrl?.pathname ?? new URL(req.url).pathname;
    const route = pathname.replace(/\b([0-9a-f-]{6,})\b/g, ":id"); // normalize ids
    const method = req.method;
    
    // Extract additional context
    const ip_address = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const user_agent = req.headers.get("user-agent") ?? "unknown";

    return withRequestContext({ 
      request_id, 
      route, 
      method, 
      ip_address, 
      user_agent 
    }, async () => {
      const log = logBase({ 
        request_id, 
        route, 
        method, 
        env: process.env.NODE_ENV ?? "dev",
        ip_address,
        user_agent: user_agent.substring(0, 100) // Truncate for storage efficiency
      });
      
      // Handle both NextRequest and regular Request objects (for tests)
      const searchParams = (req as any).nextUrl?.searchParams ?? new URL(req.url).searchParams;
      
      log.info({ 
        evt: "request", 
        query: Object.fromEntries(searchParams),
        content_length: req.headers.get("content-length") ?? "0"
      });

      try {
        const res = await handler(req, ctx);
        const duration_ms = Date.now() - started;
        
        // Log response with additional context
        const logLevel = res.status >= 400 ? "warn" : "info";
        log[logLevel]({ 
          evt: "response", 
          status: res.status, 
          duration_ms,
          response_size: res.headers.get("content-length") ?? "unknown"
        });
        
        return res;
      } catch (err: any) {
        const duration_ms = Date.now() - started;
        const error_message = String(err?.message ?? err);
        const { category, severity } = categorizeError(err);
        
        // Log error with categorization
        log.error({ 
          evt: "error", 
          status: 500, 
          duration_ms, 
          error_message, 
          error_code: err?.code,
          error_category: category,
          error_severity: severity,
          error_stack: err?.stack,
          err // Let pino serialize the full error object
        });
        
        return NextResponse.json({ 
          error: { 
            message: "Internal error", 
            request_id,
            // Only include request_id in response, not full error details
          } 
        }, { status: 500 });
      }
    });
  };
}
