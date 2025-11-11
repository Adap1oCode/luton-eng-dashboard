export type RawLocationInput = {
  location?: string | null;
  qty?: number | string | null;
  pos?: number | string | null;
};

export type NormalizedLocation = {
  location: string;
  qty: number;
  pos: number;
};

const GUARD_ERROR_MESSAGE =
  "Multi-location mode requires at least one location. Please add locations before saving.";

export function normalizeLocations(source?: RawLocationInput[] | null): NormalizedLocation[] {
  if (!Array.isArray(source) || source.length === 0) {
    return [];
  }

  const normalized = source
    .map((loc, idx) => {
      const locationValue = typeof loc?.location === "string" ? loc.location.trim() : "";
      if (!locationValue) {
        return null;
      }

      const qtyNumber = Number(loc?.qty);
      const posNumber = Number(loc?.pos);

      return {
        location: locationValue,
        qty: Number.isFinite(qtyNumber) ? qtyNumber : 0,
        pos: Number.isFinite(posNumber) ? posNumber : idx + 1,
      };
    })
    .filter((loc): loc is NormalizedLocation => loc !== null)
    .sort((a, b) => {
      if (a.pos !== b.pos) {
        return a.pos - b.pos;
      }
      return a.location.localeCompare(b.location);
    });

  return normalized;
}

export function fingerprintLocations(locations: NormalizedLocation[]): string {
  if (!Array.isArray(locations) || locations.length === 0) {
    return "[]";
  }

  const sorted = [...locations].sort((a, b) => {
    if (a.pos !== b.pos) {
      return a.pos - b.pos;
    }
    return a.location.localeCompare(b.location);
  });

  return JSON.stringify(
    sorted.map((loc) => [
      typeof loc.location === "string" ? loc.location.trim() : "",
      Number.isFinite(loc.qty) ? loc.qty : Number(loc.qty) || 0,
      Number.isFinite(loc.pos) ? loc.pos : null,
    ]),
  );
}

export function deriveLocationsFromAggregate(
  aggregatedLocation: unknown,
  aggregatedQty: unknown,
): NormalizedLocation[] {
  if (typeof aggregatedLocation !== "string") {
    return [];
  }

  const parts = aggregatedLocation
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [];
  }

  const qtyNumber = Number(aggregatedQty);
  const primaryQty = Number.isFinite(qtyNumber) ? qtyNumber : 0;

  return parts.map((loc, idx) => ({
    location: loc,
    qty: idx === 0 ? primaryQty : 0,
    pos: idx + 1,
  }));
}

export function prepareLocationsForSubmit(params: {
  source: RawLocationInput[] | undefined;
  aggregatedLocation: unknown;
  aggregatedQty: unknown;
}): { normalized: NormalizedLocation[]; seededFromAggregate: boolean } {
  const { source, aggregatedLocation, aggregatedQty } = params;

  const initialSource = Array.isArray(source) ? source : [];
  let seededFromAggregate = false;
  let effectiveSource = initialSource;

  if (effectiveSource.length === 0) {
    const seeded = deriveLocationsFromAggregate(aggregatedLocation, aggregatedQty);
    if (seeded.length > 0) {
      effectiveSource = seeded;
      seededFromAggregate = true;
    }
  }

  const normalized = normalizeLocations(effectiveSource);

  if (normalized.length === 0) {
    throw new Error(GUARD_ERROR_MESSAGE);
  }

  return { normalized, seededFromAggregate };
}

export { GUARD_ERROR_MESSAGE as MULTI_LOCATION_GUARD_ERROR_MESSAGE };

