// -----------------------------------------------------------------------------
// FILE: src/hooks/use-inventory-dialog.ts
// TYPE: Shared hook for inventory dialog state management
// PURPOSE: Reusable hook for managing inventory info dialog state across screens
// -----------------------------------------------------------------------------

import { useState, useCallback } from "react";

/**
 * Hook for managing inventory info dialog state.
 * Provides state and handlers for opening/closing the dialog with an item number.
 * 
 * @returns Object containing dialog state and handlers
 */
export function useInventoryDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItemNumber, setSelectedItemNumber] = useState<string | number | null>(null);

  const handleItemNumberClick = useCallback((itemNumber: string | number | null) => {
    setSelectedItemNumber(itemNumber);
    setShowDialog(true);
  }, []);

  return {
    showDialog,
    setShowDialog,
    selectedItemNumber,
    handleItemNumberClick,
  };
}



