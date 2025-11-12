// -----------------------------------------------------------------------------
// FILE: src/components/data-table/cells/item-number-cell.tsx
// TYPE: Reusable cell component for item number display
// PURPOSE: Standardized rendering of item numbers with optional click handler
// -----------------------------------------------------------------------------

/**
 * Cell component for displaying item numbers.
 * Handles both string and number types, with optional click handler for opening dialogs.
 * 
 * @param value - Item number value (string, number, or null)
 * @param onClick - Optional click handler function
 */
export function ItemNumberCell({ 
  value, 
  onClick 
}: { 
  value: string | number | null; 
  onClick?: (value: string | number | null) => void;
}) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }
  
  if (onClick) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick(value);
        }}
        className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-300 dark:hover:text-blue-200 cursor-pointer"
      >
        {String(value)}
      </button>
    );
  }
  
  return <span>{String(value)}</span>;
}



