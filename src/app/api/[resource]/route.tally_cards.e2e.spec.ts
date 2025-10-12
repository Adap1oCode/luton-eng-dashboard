// src/app/api/[resource]/route.tally_cards.e2e.spec.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Only run when the caller provides live anon env vars.
// We don't create new files or mutate env here.
const HAS_ENV = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

(HAS_ENV ? describe : describe.skip)(
  "E2E (live, no mocks): /api/tally_cards end-to-end",
  () => {
    let supabase!: SupabaseClient;
    let GET!: (req: Request, ctx?: any) => Promise<Response>;

    beforeAll(async () => {
      // Construct the client only after we've confirmed env presence
      supabase = createClient(
        process.env.SUPABASE_URL as string,
        process.env.SUPABASE_ANON_KEY as string,
        { auth: { persistSession: false } }
      );

      // Import once and reuse
      const mod = await import("./route");
      GET = mod.GET;
    });

    // Helper: fetch a single, real row from the live DB (cheap probe)
    async function fetchOneSample() {
      const { data, error } = await supabase
        .from("tcm_tally_cards")
        .select(
          "id,tally_card_number,warehouse,item_number,note,is_active,created_at,updated_at"
        )
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    }

    it("direct DB probe works (live Supabase anon)", async () => {
      const sample = await fetchOneSample();
      // If table is empty, just skip the assertions that require data.
      if (!sample) {
        console.warn("[E2E] tcm_tally_cards has no rows; skipping probe specifics.");
        expect(true).toBe(true);
        return;
      }

      // Minimal sanity on the row
      expect(sample).toHaveProperty("id");
      expect(sample).toHaveProperty("tally_card_number");
      // item_number might be bigint in DB; we only check presence here
      expect(sample).toHaveProperty("item_number");
    });

    it("returns a real row via the generic API route (projection applied)", async () => {
      const sample = await fetchOneSample();
      if (!sample) {
        console.warn("[E2E] tcm_tally_cards has no rows; skipping projection verification.");
        expect(true).toBe(true);
        return;
      }

      // Hit the REAL handler the same way Next.js would (Request object)
      const url = new URL("http://x.local/api/tally_cards");
      url.searchParams.set("q", String(sample.tally_card_number)); // exercise config.search
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "50");

      const req = new Request(url.toString(), { headers: new Headers() });
      const res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
      expect(res.ok).toBe(true);

      const body = await res.json();

      // Contract checks
      expect(body.resource).toBe("tally_cards");
      expect(Array.isArray(body.rows)).toBe(true);
      expect(typeof body.total === "number").toBe(true);

      const viaApi = body.rows.find(
        (r: any) => r.tally_card_number === sample.tally_card_number
      );
      expect(viaApi).toBeTruthy();

      // Projection: item_number should be string on the transport shape
      expect(typeof viaApi.item_number).toBe("string");
      expect(viaApi.item_number).toBe(String(sample.item_number));

      // Additional sanity to prove it's the same record
      expect(viaApi.warehouse).toBe(sample.warehouse);
      expect(Boolean(viaApi.is_active)).toBe(Boolean(sample.is_active));
    });

    it("returns raw domain rows when ?raw=true (no projection)", async () => {
      const sample = await fetchOneSample();
      if (!sample) {
        console.warn("[E2E] tcm_tally_cards has no rows; skipping raw=true verification.");
        expect(true).toBe(true);
        return;
      }

      const url = new URL("http://x.local/api/tally_cards");
      url.searchParams.set("q", String(sample.tally_card_number));
      url.searchParams.set("raw", "true");

      const req = new Request(url.toString(), { headers: new Headers() });
      const res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
      expect(res.ok).toBe(true);

      const body = await res.json();
      expect(body.raw).toBe(true);
      expect(Array.isArray(body.rows)).toBe(true);

      const viaApi = body.rows.find(
        (r: any) => r.tally_card_number === sample.tally_card_number
      );
      expect(viaApi).toBeTruthy();

      // Domain should preserve numeric item_number (no projection)
      expect(typeof viaApi.item_number).toBe("number");
      expect(viaApi.item_number).toBe(sample.item_number);
    });

    it("respects default sort/pagination contract when no filters are provided", async () => {
      // This exercises: route -> resolveResource -> provider -> Supabase
      const url = new URL("http://x.local/api/tally_cards");
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "10"); // small page to test length <= pageSize

      const req = new Request(url.toString(), { headers: new Headers() });
      const res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
      expect(res.ok).toBe(true);

      const body = await res.json();
      expect(Array.isArray(body.rows)).toBe(true);
      expect(typeof body.total === "number").toBe(true);
      expect(body.rows.length).toBeLessThanOrEqual(10);

      // If 2+ rows, check they are non-decreasing by the configured default sort.
      // Your config’s default sort is: { column: "tally_card_number", desc: false }
      if (body.rows.length >= 2) {
        for (let i = 1; i < body.rows.length; i++) {
          const prev = String(body.rows[i - 1].tally_card_number ?? "");
          const curr = String(body.rows[i].tally_card_number ?? "");
          expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
        }
      }
    });

    it("returns zero rows when q has no match (search mapping is exercised)", async () => {
      const url = new URL("http://x.local/api/tally_cards");
      url.searchParams.set("q", "__NO_MATCH__" + Date.now()); // guaranteed miss
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "5");

      const req = new Request(url.toString(), { headers: new Headers() });
      const res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
      expect(res.ok).toBe(true);

      const body = await res.json();
      expect(Array.isArray(body.rows)).toBe(true);
      expect(body.rows.length).toBe(0);
      expect(typeof body.total === "number").toBe(true);
      // When your route counts correctly, total should be 0 for a firm miss:
      expect(body.total).toBe(0);
    });

    it("returns an error for an unknown resource (config guard path)", async () => {
      const url = new URL("http://x.local/api/___not_a_resource___");
      const req = new Request(url.toString(), { headers: new Headers() });

      const res = await GET(req as any, { params: { resource: "___not_a_resource___" } } as any);
      // Your implementation may return 400 or 404; accept either to keep this robust.
      expect([400, 404]).toContain(res.status);
    });
  }
);
