// src/app/api/[resource]/[id]/route.ts
// Thin wrapper delegates to shared item handlers

import { awaitParams, type AwaitableParams } from "@/lib/next/server-helpers";
import { getOneHandler, updateHandler, deleteHandler } from "@/lib/api/handle-item";

export const dynamic = "force-dynamic";

/** Normalize and validate the id coming from the URL segment. */
function normalizeId(raw: string): string {
  // Trim and decode URI-encoded values (e.g., %7C)
  const decoded = decodeURIComponent(String(raw ?? "").trim());
  return decoded;
}

/** Return a standard JSON Response for 400 errors. */
function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  req: Request,
  ctx: AwaitableParams<{ resource: string; id: string }>
) {
  const { resource, id } = await awaitParams(ctx);
  const normalizedId = normalizeId(id);

  // Guard against accidental composite ids ("uuid|...").
  if (normalizedId.includes("|")) {
    return badRequest("Invalid id format. Expected a single id (e.g., a UUID), not a composite value.");
  }

  return getOneHandler(req, resource, normalizedId);
}

export async function PATCH(
  req: Request,
  ctx: AwaitableParams<{ resource: string; id: string }>
) {
  const { resource, id } = await awaitParams(ctx);
  const normalizedId = normalizeId(id);

  if (normalizedId.includes("|")) {
    return badRequest("Invalid id format. Expected a single id (e.g., a UUID), not a composite value.");
  }

  // Prevent writes to SQL views explicitly (safety & clearer errors).
  if (resource?.startsWith("v_")) {
    return badRequest(
      "Writes are not allowed for view resources. Use the base table resource instead (e.g., 'tcm_user_tally_card_entries')."
    );
  }

  return updateHandler(req, resource, normalizedId);
}

export async function DELETE(
  req: Request,
  ctx: AwaitableParams<{ resource: string; id: string }>
) {
  const { resource, id } = await awaitParams(ctx);
  const normalizedId = normalizeId(id);

  if (normalizedId.includes("|")) {
    return badRequest("Invalid id format. Expected a single id (e.g., a UUID), not a composite value.");
  }

  // Prevent writes to SQL views explicitly (safety & clearer errors).
  if (resource?.startsWith("v_")) {
    return badRequest(
      "Writes are not allowed for view resources. Use the base table resource instead (e.g., 'tcm_user_tally_card_entries')."
    );
  }

  return deleteHandler(req, resource, normalizedId);
}
