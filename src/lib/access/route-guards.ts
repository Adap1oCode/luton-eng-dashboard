/**
 * Server-side route protection utilities
 * 
 * Provides functions to protect routes based on screen permissions and warehouse access.
 */

import "server-only";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/get-session-context";
import { buildGuards } from "./guards";

/**
 * Extract screen slug from route path.
 * Example: "/forms/stock-adjustments" -> "stock-adjustments"
 */
export function extractScreenSlug(pathname: string): string | null {
  const match = pathname.match(/\/forms\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Protect a route by checking view permission for the screen.
 * 
 * @param pathname - The route pathname (e.g., "/forms/stock-adjustments")
 * @param warehouseParam - Optional warehouse code from query params to validate
 * @returns Guards object if access granted, otherwise redirects
 */
export async function protectRoute(
  pathname: string,
  warehouseParam?: string | null
) {
  const screen = extractScreenSlug(pathname);
  if (!screen) {
    // Not a forms route, allow through
    return null;
  }

  let ctx;
  try {
    ctx = await getSessionContext();
  } catch (error) {
    // Log the error for troubleshooting (errors should be visible, not swallowed)
    const { logger } = await import("@/lib/obs/logger");
    logger.error({
      component: "route-guards",
      function: "protectRoute",
      pathname,
      warehouseParam,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    }, "Failed to get session context - redirecting to login");
    
    // Always redirect to login for any error (defense in depth)
    // This ensures unauthenticated users are redirected even if error message format changes
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }
  
  const guards = buildGuards({
    roleCode: ctx.effectiveUser.roleCode,
    roleFamily: ctx.effectiveUser.roleFamily,
    permissions: ctx.permissions,
    allowedWarehouseCodes: ctx.allowedWarehouseCodes,
  });

  // Check view permission
  if (!guards.canView(screen)) {
    redirect("/");
  }

  // If warehouse param is provided, validate access
  if (warehouseParam && warehouseParam !== "ALL") {
    if (!guards.inWarehouse(warehouseParam)) {
      redirect("/");
    }
  }

  return guards;
}

/**
 * Protect an edit route by checking update permission and warehouse access.
 * 
 * @param pathname - The route pathname (e.g., "/forms/stock-adjustments/[id]/edit")
 * @param recordWarehouseCode - The warehouse code of the record being edited
 * @returns Guards object if access granted, otherwise redirects
 */
export async function protectEditRoute(
  pathname: string,
  recordWarehouseCode?: string | null
) {
  const screen = extractScreenSlug(pathname);
  if (!screen) {
    redirect("/");
  }

  let ctx;
  try {
    ctx = await getSessionContext();
  } catch (error) {
    // Log the error for troubleshooting (errors should be visible, not swallowed)
    const { logger } = await import("@/lib/obs/logger");
    logger.error({
      component: "route-guards",
      function: "protectEditRoute",
      pathname,
      recordWarehouseCode,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    }, "Failed to get session context - redirecting to login");
    
    // Always redirect to login for any error (defense in depth)
    // This ensures unauthenticated users are redirected even if error message format changes
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }
  
  const guards = buildGuards({
    roleCode: ctx.effectiveUser.roleCode,
    roleFamily: ctx.effectiveUser.roleFamily,
    permissions: ctx.permissions,
    allowedWarehouseCodes: ctx.allowedWarehouseCodes,
  });

  // Check update permission
  if (!guards.canUpdate(screen)) {
    redirect("/");
  }

  // If record has a warehouse, validate access
  if (recordWarehouseCode) {
    if (!guards.inWarehouse(recordWarehouseCode)) {
      redirect("/");
    }
  }

  return guards;
}


