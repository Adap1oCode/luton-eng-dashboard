/**
 * Banner component shown when user has no warehouse access
 * 
 * Displays a non-blocking informational message when allowedWarehouseCodes is empty
 * and user is not an Administrator.
 */

"use client";

import { useAccess } from "@/lib/access/useAccess";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function NoWarehouseAccessBanner() {
  const { access, isLoading } = useAccess();

  // Don't show if loading or if user has warehouse access
  if (isLoading || !access || access.allowedWarehouseCodes.length > 0) {
    return null;
  }

  // Don't show for Administrators (they should have explicit warehouse assignments)
  if (access.roleCode === "ADMINISTRATOR") {
    return null;
  }

  return (
    <Alert variant="default" className="mb-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        You don't have access to any warehouses. Ask an admin to assign at least one warehouse to your role.
      </AlertDescription>
    </Alert>
  );
}

