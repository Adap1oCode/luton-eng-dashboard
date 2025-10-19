// src/app/api/[resource]/[id]/route.ts
// Thin wrapper delegates to shared item handlers

import { awaitParams, type AwaitableParams } from "@/lib/next/server-helpers";
import { getOneHandler, updateHandler, deleteHandler } from "@/lib/api/handle-item";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: AwaitableParams<{ resource: string; id: string }>
) {
  const { resource, id } = await awaitParams(ctx);
  return getOneHandler(req, resource, id);
}

export async function PATCH(
  req: Request,
  ctx: AwaitableParams<{ resource: string; id: string }>
) {
  const { resource, id } = await awaitParams(ctx);
  return updateHandler(req, resource, id);
}

export async function DELETE(
  req: Request,
  ctx: AwaitableParams<{ resource: string; id: string }>
) {
  const { resource, id } = await awaitParams(ctx);
  return deleteHandler(req, resource, id);
}
