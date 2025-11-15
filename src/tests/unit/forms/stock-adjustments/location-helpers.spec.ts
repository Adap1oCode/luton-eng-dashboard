import { describe, it, expect } from "vitest";

import {
  normalizeLocations,
  fingerprintLocations,
  deriveLocationsFromAggregate,
  prepareLocationsForSubmit,
  MULTI_LOCATION_GUARD_ERROR_MESSAGE,
} from "@/app/(main)/forms/stock-adjustments/utils/location-helpers";

describe("stock adjustments location helpers", () => {
  it("normalizes location inputs with trimming, numeric conversion, and ordering", () => {
    const result = normalizeLocations([
      { location: " B2 ", qty: "3", pos: "2" },
      { location: "A1", qty: 1, pos: 1 },
      { location: "", qty: 9 },
      { location: "C3", qty: null, pos: null },
      null as any,
    ]);

    expect(result).toEqual([
      { location: "A1", qty: 1, pos: 1 },
      { location: "B2", qty: 3, pos: 2 },
      { location: "C3", qty: 0, pos: 3 },
    ]);
  });

  it("returns an empty array when normalizeLocations receives no usable data", () => {
    expect(normalizeLocations(undefined)).toEqual([]);
    expect(normalizeLocations(null)).toEqual([]);
    expect(normalizeLocations([])).toEqual([]);
  });

  it("fingerprints locations deterministically regardless of ordering", () => {
    const canonical = [
      { location: "A1", qty: 2, pos: 1 },
      { location: "B2", qty: 4, pos: 2 },
    ];
    const shuffled = [
      { location: "B2", qty: 4, pos: 2 },
      { location: "A1", qty: 2, pos: 1 },
    ];

    expect(fingerprintLocations(canonical)).toBe(fingerprintLocations(shuffled));
  });

  it("returns empty fingerprint when no locations are provided", () => {
    expect(fingerprintLocations([])).toBe("[]");
  });

  it("derives structured locations from aggregated string and quantity", () => {
    const derived = deriveLocationsFromAggregate("A1, B2 ,C3", "7");
    expect(derived).toEqual([
      { location: "A1", qty: 7, pos: 1 },
      { location: "B2", qty: 0, pos: 2 },
      { location: "C3", qty: 0, pos: 3 },
    ]);
  });

  it("returns empty array when deriveLocationsFromAggregate cannot parse input", () => {
    expect(deriveLocationsFromAggregate(undefined, 5)).toEqual([]);
    expect(deriveLocationsFromAggregate("", 5)).toEqual([]);
  });

  it("seeds locations from aggregated fields when submission payload is empty", () => {
    const { normalized, seededFromAggregate } = prepareLocationsForSubmit({
      source: [],
      aggregatedLocation: "A1, A2",
      aggregatedQty: "9",
    });

    expect(seededFromAggregate).toBe(true);
    expect(normalized).toEqual([
      { location: "A1", qty: 9, pos: 1 },
      { location: "A2", qty: 0, pos: 2 },
    ]);
  });

  it("passes through existing location rows without reseeding", () => {
    const input = [
      { location: "B1", qty: 3, pos: 2 },
      { location: "A1", qty: 1, pos: 1 },
    ];
    const { normalized, seededFromAggregate } = prepareLocationsForSubmit({
      source: input,
      aggregatedLocation: null,
      aggregatedQty: null,
    });

    expect(seededFromAggregate).toBe(false);
    expect(normalized).toEqual([
      { location: "A1", qty: 1, pos: 1 },
      { location: "B1", qty: 3, pos: 2 },
    ]);
  });

  it("throws a guard error when no locations are present after preparation", () => {
    expect(() =>
      prepareLocationsForSubmit({
        source: [],
        aggregatedLocation: null,
        aggregatedQty: null,
      }),
    ).toThrowError(new Error(MULTI_LOCATION_GUARD_ERROR_MESSAGE));
  });
});










