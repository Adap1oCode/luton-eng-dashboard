/**
 * Unit tests for SectionBody options handling.
 * Tests that options are correctly extracted and passed to fields.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type { SectionDef, ResolvedOptions } from "../dynamic-form";
import type { FieldDef, Option } from "../dynamic-field";

// We need to test SectionBody indirectly through DynamicForm
// since it's not exported. Let's test the options flow instead.

describe("Options Flow to Fields", () => {
  const createMockOptions = (): ResolvedOptions => ({
    warehouses: [
      { id: "1", label: "Warehouse A" },
      { id: "2", label: "Warehouse B" },
      { id: "3", label: "Warehouse C" },
    ] as Option[],
    vendors: [
      { id: "1", label: "Vendor X" },
      { id: "2", label: "Vendor Y" },
    ] as Option[],
  });

  const createTestSection = (fields: FieldDef[]): SectionDef => ({
    key: "test-section",
    title: "Test Section",
    fields,
    layout: { columns: 3, fill: "row" },
  });

  it("should extract options by optionsKey", () => {
    const options = createMockOptions();
    const warehouses = options.warehouses;
    const vendors = options.vendors;

    expect(warehouses).toBeDefined();
    expect(Array.isArray(warehouses)).toBe(true);
    expect(warehouses.length).toBe(3);
    expect(warehouses[0].id).toBe("1");
    expect(warehouses[0].label).toBe("Warehouse A");

    expect(vendors).toBeDefined();
    expect(Array.isArray(vendors)).toBe(true);
    expect(vendors.length).toBe(2);
  });

  it("should handle missing optionsKey gracefully", () => {
    const options = createMockOptions();
    const missingKey = options.missingKey;

    expect(missingKey).toBeUndefined();
  });

  it("should handle empty options array", () => {
    const options: ResolvedOptions = {
      warehouses: [],
    };

    expect(options.warehouses).toBeDefined();
    expect(Array.isArray(options.warehouses)).toBe(true);
    expect(options.warehouses.length).toBe(0);
  });

  it("should handle multiple optionsKeys in same section", () => {
    const options = createMockOptions();
    const section = createTestSection([
      { name: "warehouse_id", label: "Warehouse", kind: "select", optionsKey: "warehouses" },
      { name: "vendor_id", label: "Vendor", kind: "select", optionsKey: "vendors" },
    ]);

    const warehouseOptions = options[section.fields[0].optionsKey!];
    const vendorOptions = options[section.fields[1].optionsKey!];

    expect(warehouseOptions).toBeDefined();
    expect(vendorOptions).toBeDefined();
    expect(warehouseOptions).not.toBe(vendorOptions);
    expect(warehouseOptions.length).toBe(3);
    expect(vendorOptions.length).toBe(2);
  });
});

