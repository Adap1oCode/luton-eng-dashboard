/**
 * Permission guard utilities for RBAC v2
 * 
 * Provides helper functions to check screen-level permissions and warehouse access.
 * All permissions follow the pattern: screen:{screen-slug}:{action}
 * Actions: view, create, update, delete, export
 */

export type SessionAccess = {
  roleCode: string | null;
  roleFamily: string | null;
  permissions: string[];
  allowedWarehouseCodes: string[];
};

/**
 * Helper: if a permission implies view access, automatically grant view.
 * For example, having "create" implies you can "view" the screen.
 */
const impliesView = (p: string) =>
  p.endsWith(":create") || p.endsWith(":update") || p.endsWith(":delete") || p.endsWith(":export");

/**
 * Build guard functions from session access data.
 * 
 * @param s - Session access data (permissions and warehouse codes)
 * @returns Object with guard functions for checking permissions and warehouse access
 */
export function buildGuards(s: SessionAccess) {
  // Build base permission set, including implied view permissions
  const base = new Set(s.permissions ?? []);
  for (const p of Array.from(base)) {
    if (impliesView(p)) {
      const screen = p.split(":")[1];
      base.add(`screen:${screen}:view`);
    }
  }
  
  const has = (k: string) => base.has(k);
  
  return {
    /**
     * Check if user has a specific permission key
     */
    has,
    
    /**
     * Check if user can view a screen
     */
    canView: (screen: string) => has(`screen:${screen}:view`),
    
    /**
     * Check if user can create records in a screen
     */
    canCreate: (screen: string) => has(`screen:${screen}:create`),
    
    /**
     * Check if user can update records in a screen
     */
    canUpdate: (screen: string) => has(`screen:${screen}:update`),
    
    /**
     * Check if user can delete records in a screen
     */
    canDelete: (screen: string) => has(`screen:${screen}:delete`),
    
    /**
     * Check if user can export data from a screen
     */
    canExport: (screen: string) => has(`screen:${screen}:export`),
    
    /**
     * Check if user has access to a specific warehouse code.
     * Returns false if code is null/undefined (no implicit "all" access).
     */
    inWarehouse: (code?: string | null) =>
      !code ? false : (s.allowedWarehouseCodes ?? []).includes(code),
  };
}

