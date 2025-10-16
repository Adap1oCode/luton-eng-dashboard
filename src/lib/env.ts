// src/lib/env.ts
export const AUTH_SCOPING_ENABLED =
  (process.env.AUTH_SCOPING_ENABLED ?? "true").toLowerCase() === "true";
export const DEBUG_AUTH =
  (process.env.DEBUG_AUTH ?? "true").toLowerCase() === "true";
