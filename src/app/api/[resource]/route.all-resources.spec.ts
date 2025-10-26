import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import resources from "@/lib/data/resources";

// Mock the Supabase factory for all tests
vi.mock("@/lib/supabase/factory", () => ({
  createSupabaseServerProvider: vi.fn(() => ({
    list: vi.fn(async () => ({
      rows: [
        { id: "1", name: "test", created_at: "2025-01-01T00:00:00Z" },
        { id: "2", name: "test2", created_at: "2025-01-02T00:00:00Z" }
      ],
      total: 2,
    })),
  })),
}));

// Mock session context for all tests
vi.mock("@/lib/auth/get-session-context", () => ({
  getSessionContext: async () => ({
    userId: "test-user-id",
    canSeeAllWarehouses: true,
    allowedWarehouses: [],
    permissions: [],
  }),
}));

describe("API Routes - All Resources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test all resources through the generic API route
  const resourceKeys = Object.keys(resources);
  
  for (const resourceKey of resourceKeys) {
    describe(`GET /api/${resourceKey}`, () => {
      it("should return valid response structure", async () => {
        const mod = await import("./route");
        const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

        const req = new Request(`http://x.local/api/${resourceKey}?page=1&pageSize=10`);
        const res = await GET(req as any, { params: { resource: resourceKey } } as any);

        expect(res).toBeInstanceOf(Response);
        expect(res.ok).toBe(true);

        const body = await res.json();

        // Validate response structure
        expect(body).toHaveProperty("resource");
        expect(body).toHaveProperty("rows");
        expect(body).toHaveProperty("total");
        expect(body).toHaveProperty("page");
        expect(body).toHaveProperty("pageSize");

        expect(body.resource).toBe(resourceKey);
        expect(Array.isArray(body.rows)).toBe(true);
        expect(typeof body.total).toBe("number");
        expect(typeof body.page).toBe("number");
        expect(typeof body.pageSize).toBe("number");

        console.log(`✅ ${resourceKey}: API route successful`);
      });

      it("should handle pagination parameters", async () => {
        const mod = await import("./route");
        const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

        const req = new Request(`http://x.local/api/${resourceKey}?page=2&pageSize=5`);
        const res = await GET(req as any, { params: { resource: resourceKey } } as any);

        expect(res.ok).toBe(true);
        const body = await res.json();

        expect(body.page).toBe(2);
        expect(body.pageSize).toBe(5);
        expect(Array.isArray(body.rows)).toBe(true);

        console.log(`✅ ${resourceKey}: Pagination parameters handled`);
      });

      it("should handle search queries", async () => {
        const mod = await import("./route");
        const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

        const req = new Request(`http://x.local/api/${resourceKey}?q=test&page=1&pageSize=10`);
        const res = await GET(req as any, { params: { resource: resourceKey } } as any);

        expect(res.ok).toBe(true);
        const body = await res.json();

        expect(Array.isArray(body.rows)).toBe(true);
        expect(typeof body.total).toBe("number");

        console.log(`✅ ${resourceKey}: Search query handled`);
      });

      it("should handle raw=true parameter", async () => {
        const mod = await import("./route");
        const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

        const req = new Request(`http://x.local/api/${resourceKey}?page=1&pageSize=10&raw=true`);
        const res = await GET(req as any, { params: { resource: resourceKey } } as any);

        if (res.ok) {
          const body = await res.json();
          expect(body.raw).toBe(true);
          expect(Array.isArray(body.rows)).toBe(true);
          console.log(`✅ ${resourceKey}: Raw parameter handled`);
        } else {
          // Some resources might not allow raw=true
          const body = await res.json();
          if (body.error?.message?.includes("raw")) {
            console.log(`⚠️  ${resourceKey}: Raw not allowed (expected)`);
          } else {
            throw new Error(`Unexpected error: ${body.error?.message}`);
          }
        }
      });

      it("should handle sorting parameters", async () => {
        const mod = await import("./route");
        const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

        const req = new Request(`http://x.local/api/${resourceKey}?sort=id&order=desc&page=1&pageSize=10`);
        const res = await GET(req as any, { params: { resource: resourceKey } } as any);

        expect(res.ok).toBe(true);
        const body = await res.json();

        expect(Array.isArray(body.rows)).toBe(true);
        expect(typeof body.total).toBe("number");

        console.log(`✅ ${resourceKey}: Sorting parameters handled`);
      });

      it("should handle boolean filters", async () => {
        const mod = await import("./route");
        const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

        const req = new Request(`http://x.local/api/${resourceKey}?active=true&page=1&pageSize=10`);
        const res = await GET(req as any, { params: { resource: resourceKey } } as any);

        expect(res.ok).toBe(true);
        const body = await res.json();

        expect(Array.isArray(body.rows)).toBe(true);
        expect(typeof body.total).toBe("number");

        console.log(`✅ ${resourceKey}: Boolean filters handled`);
      });
    });
  }

  // Test aliases work through API
  describe("API Route Aliases", () => {
    it("should handle stock-adjustments alias", async () => {
      const mod = await import("./route");
      const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

      const req = new Request("http://x.local/api/stock-adjustments?page=1&pageSize=10");
      const res = await GET(req as any, { params: { resource: "stock-adjustments" } } as any);

      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.resource).toBe("stock-adjustments");
    });

    it("should handle tally-cards alias", async () => {
      const mod = await import("./route");
      const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

      const req = new Request("http://x.local/api/tally-cards?page=1&pageSize=10");
      const res = await GET(req as any, { params: { resource: "tally-cards" } } as any);

      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.resource).toBe("tally-cards");
    });
  });

  // Test error handling
  describe("API Route Error Handling", () => {
    it("should return 404 for unknown resources", async () => {
      const mod = await import("./route");
      const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

      const req = new Request("http://x.local/api/unknown-resource");
      const res = await GET(req as any, { params: { resource: "unknown-resource" } } as any);

      expect(res.status).toBeGreaterThanOrEqual(400);
      const body = await res.json();
      expect(body.error?.message).toMatch(/unknown resource/i);
    });

    it("should handle invalid pagination gracefully", async () => {
      const mod = await import("./route");
      const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

      const req = new Request("http://x.local/api/users?page=-1&pageSize=0");
      const res = await GET(req as any, { params: { resource: "users" } } as any);

      expect(res.ok).toBe(true);
      const body = await res.json();
      
      // Should clamp to valid values
      expect(body.page).toBeGreaterThan(0);
      expect(body.pageSize).toBeGreaterThan(0);
    });
  });
});

