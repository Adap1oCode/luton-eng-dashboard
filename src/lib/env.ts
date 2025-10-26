// src/lib/env.ts
export const AUTH_SCOPING_ENABLED =
  (process.env.AUTH_SCOPING_ENABLED ?? "false").toLowerCase() === "true";
export const DEBUG_AUTH =
  (process.env.DEBUG_AUTH ?? "true").toLowerCase() === "true";
