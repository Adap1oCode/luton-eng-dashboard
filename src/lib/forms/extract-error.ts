export async function extractErrorMessage(res: Response): Promise<string> {
  // Prefer JSON: { error: { message } } or { message }
  try {
    const data = await res.clone().json();
    if (data?.error?.message) return String(data.error.message);
    if (data?.message) return String(data.message);
  } catch {}

  // Fallback to text body
  try {
    const text = await res.clone().text();
    if (text?.trim()) return text.slice(0, 4000);
  } catch {}

  // Nice-to-have header from API
  const hdr = res.headers.get("X-Error-Message");
  if (hdr) return hdr;

  return `Request failed with status ${res.status}`;
}
