// src/lib/data/index.ts

import { mockProvider } from "./providers/mock";
import type { DataProvider } from "./provider";

let provider: DataProvider = mockProvider;

// In future we can switch by env var, e.g.
// if (process.env.NEXT_PUBLIC_USE_SUPABASE === "true") {
//   provider = supabaseProvider;
// }

export const dataProvider: DataProvider = provider;
