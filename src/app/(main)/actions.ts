"use server";

import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

// Optional: per-call server client (kept for future needs)
async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

// Persist a small UI preference in a cookie
export async function setUIPref(key: string, value: string, days = 365) {
  const cookieStore = await cookies();
  cookieStore.set(key, value, { path: "/", maxAge: 60 * 60 * 24 * days });
}

// Optional sign-out for later use
export async function signOut() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
}
