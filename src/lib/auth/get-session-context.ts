// src/lib/auth/get-session-context.ts
import "server-only";
import { headers } from "next/headers";
import { setSessionContext, type SessionContext } from "./set-session-context";

/**
 * Convenience wrapper to get the current session context
 * using the Next.js request headers (including Supabase cookies).
 */
export async function getSessionContext(): Promise<SessionContext> {
  const hdrs = await headers();            // ✅ must await in Next 15+
  return setSessionContext(hdrs);
}
