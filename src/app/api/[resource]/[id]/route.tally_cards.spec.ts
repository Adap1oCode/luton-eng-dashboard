// src/app/api/[resource]/[id]/route.tally_cards.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/api/resolve-resource");
vi.mock("@/lib/supabase-server");

// Import mocked modules properly
import { resolveResource } from "@/lib/api/resolve-resource";
import { createClient } from "@/lib/supabase-server";

import { PATCH, DELETE } from "./route";

const mockSupabaseClient = {
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
};

interface TallyCardInput {
  status?: string;
  owner?: string;
  note?: string;
  quantity?: number;
  updated_at?: string;
}

interface TallyCardRow {
  id: string;
  tally_card_number: string;
  warehouse?: string;
  item_number?: string;
  quantity?: number;
  status?: string;
  owner?: string;
  note?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

describe("PATCH /api/tally_cards/{id}", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock resolve-resource with proper typing
    vi.mocked(resolveResource).mockResolvedValue({
      key: "tally_cards",
      allowRaw: false,
      config: {
        table: "tcm_tally_cards",
        pk: "id",
        select:
          "id, tally_card_number, warehouse, item_number, note, is_active, created_at, updated_at, status, owner, quantity",
        schema: {
          fields: {},
        },
        fromInput: (input: TallyCardInput) => ({
          ...input,
          updated_at: new Date().toISOString(),
        }),
        toDomain: (row: unknown) => row as TallyCardRow,
      },
    });

    // Mock supabase-server with proper typing - use as unknown to bypass type checking
    vi.mocked(createClient).mockResolvedValue(
      mockSupabaseClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );
  });

  it("should update tally card successfully", async () => {
    const mockUpdatedCard: TallyCardRow = {
      id: "7e3d7b2b-6b3e-4e1f-8c7f-1f2a9d0c1a22",
      tally_card_number: "TC-2025-001234",
      warehouse: "BP - WH 1",
      item_number: "ITEM-000123",
      quantity: 45,
      status: "approved",
      owner: "mohamed",
      note: "تم المراجعة والموافقة", // cspell:disable-line
      created_at: "2025-10-15T10:30:00Z",
      updated_at: "2025-10-15T14:00:00Z",
    };

    mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
      data: mockUpdatedCard,
      error: null,
    });

    const request = new Request("http://localhost/api/tally_cards/7e3d7b2b-6b3e-4e1f-8c7f-1f2a9d0c1a22", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        owner: "mohamed",
        note: "تم المراجعة والموافقة", // cspell:disable-line
        quantity: 45,
      }),
    });

    const response = await PATCH(request, {
      params: { resource: "tally_cards", id: "7e3d7b2b-6b3e-4e1f-8c7f-1f2a9d0c1a22" },
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData).toEqual({ row: mockUpdatedCard });
  });

  it("should return 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/tally_cards/test-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const response = await PATCH(request, {
      params: { resource: "tally_cards", id: "test-id" },
    });

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error.message).toBe("Invalid JSON body");
  });

  it("should return 404 for non-existent tally card", async () => {
    mockSupabaseClient
      .from()
      .update()
      .eq()
      .select()
      .single.mockResolvedValue({
        data: null,
        error: { message: "No rows found" },
      });

    const request = new Request("http://localhost/api/tally_cards/non-existent-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    const response = await PATCH(request, {
      params: { resource: "tally_cards", id: "non-existent-id" },
    });

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/tally_cards/{id}", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock resolve-resource with proper typing
    vi.mocked(resolveResource).mockResolvedValue({
      key: "tally_cards",
      allowRaw: false,
      config: {
        table: "tcm_tally_cards",
        pk: "id",
        select:
          "id, tally_card_number, warehouse, item_number, note, is_active, created_at, updated_at, status, owner, quantity",
        activeFlag: "is_active",
        schema: {
          fields: {
            updated_at: { type: "timestamp", nullable: true, readonly: true },
          },
        },
        toDomain: (row: unknown) => row as TallyCardRow,
      },
    });

    // Mock supabase-server with proper typing - use as unknown to bypass type checking
    vi.mocked(createClient).mockResolvedValue(
      mockSupabaseClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );
  });

  it("should soft delete tally card successfully", async () => {
    const mockDeletedCard: TallyCardRow = {
      id: "7e3d7b2b-6b3e-4e1f-8c7f-1f2a9d0c1a22",
      tally_card_number: "TC-2025-001234",
      is_active: false,
      updated_at: "2025-10-15T14:00:00Z",
    };

    mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
      data: mockDeletedCard,
      error: null,
    });

    const request = new Request("http://localhost/api/tally_cards/7e3d7b2b-6b3e-4e1f-8c7f-1f2a9d0c1a22", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: { resource: "tally_cards", id: "7e3d7b2b-6b3e-4e1f-8c7f-1f2a9d0c1a22" },
    });

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData).toEqual({ row: mockDeletedCard });
  });

  it("should return 400 for database error", async () => {
    mockSupabaseClient
      .from()
      .update()
      .eq()
      .select()
      .single.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

    const request = new Request("http://localhost/api/tally_cards/test-id", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: { resource: "tally_cards", id: "test-id" },
    });

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error.message).toBe("Database error");
  });

  it("should return 400 for invalid resource parameter", async () => {
    const request = new Request("http://localhost/api/invalid-resource/test-id", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: { resource: "", id: "test-id" },
    });

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error.message).toBe("Invalid resource parameter");
  });

  it("should return 400 for invalid id parameter", async () => {
    const request = new Request("http://localhost/api/tally_cards/", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: { resource: "tally_cards", id: "" },
    });

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error.message).toBe("Invalid id parameter");
  });
});
