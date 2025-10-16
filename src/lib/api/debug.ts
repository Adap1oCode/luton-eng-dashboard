// src/lib/api/debug.ts
import { DEBUG_AUTH } from "@/lib/env";
export function debugAuth(info: unknown) {
  if (DEBUG_AUTH) console.info("[AUTH]", info);
}
