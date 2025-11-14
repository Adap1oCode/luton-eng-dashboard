/**
 * Validates a location entry for stock adjustments.
 * Ensures location is a non-empty string and quantity is a valid non-zero number.
 * 
 * @param location - The location string (may be empty)
 * @param qty - The quantity value (may be empty string or number)
 * @returns true if both location and quantity are valid
 */
export function isValidLocationEntry(location: string, qty: number | ""): boolean {
  // Location must be a non-empty string after trimming
  const hasLocation = typeof location === "string" && location.trim().length > 0;
  
  // Quantity must be a valid finite number and not zero
  const qtyValue = typeof qty === "number" ? qty : qty === "" ? NaN : Number(qty);
  const hasQty = qty !== "" && qty !== null && qty !== undefined && Number.isFinite(qtyValue) && qtyValue !== 0;
  
  return hasLocation && hasQty;
}






