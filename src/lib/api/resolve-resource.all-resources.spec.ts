import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import resources from "@/lib/data/resources";

// Mock the Supabase factory for all tests
vi.mock("@/lib/supabase/factory", () => ({
  createSupabaseServerProvider: vi.fn(() => ({
    list: vi.fn(async () => ({
      rows: [{ id: 1, name: "test" }],
      total: 1,
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

describe("resolveResource - All Resources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test all resources in the registry
  const resourceKeys = Object.keys(resources);
  
  for (const resourceKey of resourceKeys) {
    describe(`Resource: ${resourceKey}`, () => {
      it("should resolve resource config successfully", async () => {
        const { resolveResource } = await import("./resolve-resource");
        
        try {
          const entry = await resolveResource(resourceKey);
          
          // Basic structure validation
          expect(entry).toBeDefined();
          expect(entry.key).toBe(resourceKey);
          expect(entry.config).toBeDefined();
          expect(entry.config.table).toBeDefined();
          expect(entry.config.select).toBeDefined();
          expect(entry.config.pk).toBeDefined();
          expect(typeof entry.allowRaw).toBe("boolean");
          
          // Config validation
          expect(typeof entry.config.table).toBe("string");
          expect(typeof entry.config.select).toBe("string");
          expect(typeof entry.config.pk).toBe("string");
          expect(entry.config.table.length).toBeGreaterThan(0);
          expect(entry.config.select.length).toBeGreaterThan(0);
          expect(entry.config.pk.length).toBeGreaterThan(0);
          
          // Optional fields validation
          if (entry.config.search) {
            expect(Array.isArray(entry.config.search)).toBe(true);
          }
          
          if (entry.config.defaultSort) {
            expect(entry.config.defaultSort).toHaveProperty("column");
            expect(typeof entry.config.defaultSort.column).toBe("string");
            // desc is optional, but if present should be boolean
            if (entry.config.defaultSort.desc !== undefined) {
              expect(typeof entry.config.defaultSort.desc).toBe("boolean");
            }
          }
          
          if (entry.config.activeFlag) {
            expect(typeof entry.config.activeFlag).toBe("string");
          }
          
          // Function validation
          expect(typeof entry.config.toDomain).toBe("function");
          if (entry.config.fromInput) {
            expect(typeof entry.config.fromInput).toBe("function");
          }
          
          console.log(`✅ ${resourceKey}: ${entry.config.table} (${entry.config.pk})`);
          
        } catch (error) {
          console.error(`❌ ${resourceKey}: ${error}`);
          throw error;
        }
      });

      it("should handle list operations", async () => {
        const { listHandler } = await import("./handle-list");
        
        try {
          const req = new Request(`http://x.local/api/${resourceKey}?page=1&pageSize=10`);
          const res = await listHandler(req, resourceKey);
          const body = await res.json();
          
          // Response structure validation
          expect(res.ok).toBe(true);
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
          
          console.log(`✅ ${resourceKey}: List operation successful`);
          
        } catch (error) {
          console.error(`❌ ${resourceKey}: List operation failed - ${error}`);
          throw error;
        }
      });

      it("should handle raw=true parameter", async () => {
        const { listHandler } = await import("./handle-list");
        
        try {
          const req = new Request(`http://x.local/api/${resourceKey}?page=1&pageSize=10&raw=true`);
          const res = await listHandler(req, resourceKey);
          const body = await res.json();
          
          // Raw response validation
          expect(res.ok).toBe(true);
          expect(body.raw).toBe(true);
          expect(Array.isArray(body.rows)).toBe(true);
          
          console.log(`✅ ${resourceKey}: Raw operation successful`);
          
        } catch (error) {
          // Some resources might not allow raw=true, which is fine
          if (res.status === 400 && body.error?.message?.includes("raw")) {
            console.log(`⚠️  ${resourceKey}: Raw not allowed (expected)`);
            return;
          }
          console.error(`❌ ${resourceKey}: Raw operation failed - ${error}`);
          throw error;
        }
      });

      it("should handle pagination correctly", async () => {
        const { listHandler } = await import("./handle-list");
        
        try {
          // Test page 1
          const req1 = new Request(`http://x.local/api/${resourceKey}?page=1&pageSize=5`);
          const res1 = await listHandler(req1, resourceKey);
          const body1 = await res1.json();
          
          expect(res1.ok).toBe(true);
          expect(body1.page).toBe(1);
          expect(body1.pageSize).toBe(5);
          expect(Array.isArray(body1.rows)).toBe(true);
          
          // Test page 2 (might be empty, that's ok)
          const req2 = new Request(`http://x.local/api/${resourceKey}?page=2&pageSize=5`);
          const res2 = await listHandler(req2, resourceKey);
          const body2 = await res2.json();
          
          expect(res2.ok).toBe(true);
          expect(body2.page).toBe(2);
          expect(body2.pageSize).toBe(5);
          expect(Array.isArray(body2.rows)).toBe(true);
          
          console.log(`✅ ${resourceKey}: Pagination successful`);
          
        } catch (error) {
          console.error(`❌ ${resourceKey}: Pagination failed - ${error}`);
          throw error;
        }
      });

      it("should handle search queries", async () => {
        const { listHandler } = await import("./handle-list");
        
        try {
          const req = new Request(`http://x.local/api/${resourceKey}?q=test&page=1&pageSize=10`);
          const res = await listHandler(req, resourceKey);
          const body = await res.json();
          
          expect(res.ok).toBe(true);
          expect(Array.isArray(body.rows)).toBe(true);
          
          console.log(`✅ ${resourceKey}: Search operation successful`);
          
        } catch (error) {
          console.error(`❌ ${resourceKey}: Search operation failed - ${error}`);
          throw error;
        }
      });
    });
  }

  // Test aliases work correctly
  describe("Resource Aliases", () => {
    it("should resolve stock-adjustments alias", async () => {
      const { resolveResource } = await import("./resolve-resource");
      
      const entry = await resolveResource("stock-adjustments");
      expect(entry.key).toBe("stock-adjustments");
      expect(entry.config.table).toBe("tcm_user_tally_card_entries");
    });

    it("should resolve tally-cards alias", async () => {
      const { resolveResource } = await import("./resolve-resource");
      
      const entry = await resolveResource("tally-cards");
      expect(entry.key).toBe("tally-cards");
      expect(entry.config.table).toBe("tcm_tally_cards");
    });
  });

  // Test error handling
  describe("Error Handling", () => {
    it("should reject unknown resources", async () => {
      const { resolveResource } = await import("./resolve-resource");
      
      await expect(resolveResource("unknown_resource")).rejects.toThrow();
    });

    it("should handle invalid pagination parameters", async () => {
      const { listHandler } = await import("./handle-list");
      
      const req = new Request(`http://x.local/api/users?page=-1&pageSize=0`);
      const res = await listHandler(req, "users");
      const body = await res.json();
      
      // Should clamp to valid values
      expect(body.page).toBeGreaterThan(0);
      expect(body.pageSize).toBeGreaterThan(0);
    });
  });
});
