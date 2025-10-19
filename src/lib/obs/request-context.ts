import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = {
  request_id: string;
  user_id?: string | null;
  tenant?: string | null;
  route?: string;
  method?: string;
};

export const requestContext = new AsyncLocalStorage<Ctx>();

export function withRequestContext<T>(ctx: Ctx, fn: () => Promise<T>) {
  return requestContext.run(ctx, fn);
}

export function getRequestContext(): Ctx | undefined {
  return requestContext.getStore();
}
