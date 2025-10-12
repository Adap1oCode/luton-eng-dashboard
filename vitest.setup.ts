// vitest.setup.ts
import * as dotenv from "dotenv";
import { existsSync } from "node:fs";

// Load the first env file that exists
for (const p of [".env.test.local", ".env.local", ".env"]) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// If your app uses NEXT_PUBLIC_* (common in Next.js),
// mirror them to the non-public names your tests expect.
if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
if (!process.env.SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// Optional sanity ping (keep commented by default)
// console.debug("Vitest env:", {
//   SUPABASE_URL: !!process.env.SUPABASE_URL,
//   SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
// });
