import { headers, cookies } from "next/headers";

export async function getServerBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host  = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function getForwardedCookieHeader() {
  const c = await cookies();
  const cookieHeader = c.getAll().map(v => `${v.name}=${v.value}`).join("; ");
  return cookieHeader.length ? { cookie: cookieHeader } as Record<string, string> : undefined;
}
