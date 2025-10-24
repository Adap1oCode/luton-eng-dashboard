import { describe, it, expect } from 'vitest';
import { compileFilter, applyDataFilters, isDateString } from '@/components/dashboard/client/data-filters';

describe('Data Filters', () => {
  const mockRecords = [
    { item_number: 123, description: 'Test Item 1', total_available: 10, warehouse: 'Main' },
    { item_number: 456, description: 'Test Item 2', total_available: 5, warehouse: 'Secondary' },
    { item_number: 789, description: 'Test Item 3', total_available: 0, warehouse: 'Main' },
    { item_number: 101, description: 'Special Item', total_available: 15, warehouse: null },
  ];

  const mockConfig = {
    id: 'test-dashboard',
    title: 'Test Dashboard',
    widgets: [],
    summary: [],
    tableColumns: [],
  };

  describe('compileFilter', () => {
    it('should compile equals filter correctly', () => {
      const filter = { column: 'total_available', equals: 0 };
      const compiled = compileFilter(filter);
      
      const testRecord = { total_available: 0 };
      const testRecord2 = { total_available: 5 };
      
      expect(compiled(testRecord)).toBe(true);
      expect(compiled(testRecord2)).toBe(false);
    });

    it('should compile notEquals filter correctly', () => {
      const filter = { column: 'warehouse', notEquals: 'Main' };
      const compiled = compileFilter(filter);
      
      const testRecord = { warehouse: 'Secondary' };
      const testRecord2 = { warehouse: 'Main' };
      
      expect(compiled(testRecord)).toBe(true);
      expect(compiled(testRecord2)).toBe(false);
    });

    it('should compile contains filter correctly', () => {
      const filter = { column: 'description', contains: 'Special' };
      const compiled = compileFilter(filter);
      
      const testRecord = { description: 'Special Item' };
      const testRecord2 = { description: 'Test Item 1' };
      
      expect(compiled(testRecord)).toBe(true);
      expect(compiled(testRecord2)).toBe(false);
    });

    it('should compile isNull filter correctly', () => {
      const filter = { column: 'warehouse', isNull: true };
      const compiled = compileFilter(filter);
      
      const testRecord = { warehouse: null };
      const testRecord2 = { warehouse: 'Main' };
      
      expect(compiled(testRecord)).toBe(true);
      expect(compiled(testRecord2)).toBe(false);
    });

    it('should compile isNotNull filter correctly', () => {
      const filter = { column: 'warehouse', isNotNull: true };
      const compiled = compileFilter(filter);
      
      const testRecord = { warehouse: 'Main' };
      const testRecord2 = { warehouse: null };
      
      expect(compiled(testRecord)).toBe(true);
      expect(compiled(testRecord2)).toBe(false);
    });

    it('should compile numeric comparison filters correctly', () => {
      const gtFilter = { column: 'total_available', gt: 5 };
      const ltFilter = { column: 'total_available', lt: 10 };
      const gteFilter = { column: 'total_available', gte: 10 };
      const lteFilter = { column: 'total_available', lte: 5 };
      
      const testRecord = { total_available: 8 };
      
      expect(compileFilter(gtFilter)(testRecord)).toBe(true);
      expect(compileFilter(ltFilter)(testRecord)).toBe(true);
      expect(compileFilter(gteFilter)(testRecord)).toBe(false);
      expect(compileFilter(lteFilter)(testRecord)).toBe(false);
    });

    it('should compile in filter correctly', () => {
      const filter = { column: 'warehouse', in: ['Main', 'Secondary'] };
      const compiled = compileFilter(filter);
      
      const testRecord = { warehouse: 'Main' };
      const testRecord2 = { warehouse: 'Other' };
      
      expect(compiled(testRecord)).toBe(true);
      expect(compiled(testRecord2)).toBe(false);
    });

    it('should compile notIn filter correctly', () => {
      const filter = { column: 'warehouse', notIn: ['Main', 'Secondary'] };
      const compiled = compileFilter(filter);
      
      const testRecord = { warehouse: 'Other' };
      const testRecord2 = { warehouse: 'Main' };
      
      expect(compiled(testRecord)).toBe(true);
      expect(compiled(testRecord2)).toBe(false);
    });
  });

  describe('applyDataFilters', () => {
    it('should return all records when no filters applied', () => {
      const result = applyDataFilters(mockRecords, [], mockConfig);
      expect(result).toEqual(mockRecords);
    });

    it('should filter records with single filter', () => {
      const filters = [{ column: 'total_available', equals: 0 }];
      const result = applyDataFilters(mockRecords, filters, mockConfig);
      
      expect(result).toHaveLength(1);
      expect(result[0].item_number).toBe(789);
    });

    it('should filter records with multiple filters (AND logic)', () => {
      const filters = [
        { column: 'total_available', gt: 5 },
        { column: 'warehouse', equals: 'Main' }
      ];
      const result = applyDataFilters(mockRecords, filters, mockConfig);
      
      expect(result).toHaveLength(1);
      expect(result[0].item_number).toBe(123);
    });

    it('should handle complex filter combinations', () => {
      const filters = [
        { column: 'description', contains: 'Item' },
        { column: 'total_available', gte: 5 }
      ];
      const result = applyDataFilters(mockRecords, filters, mockConfig);
      
      expect(result).toHaveLength(3);
      expect(result.map(r => r.item_number)).toEqual([123, 456, 101]);
    });

    it('should handle null values correctly', () => {
      const filters = [{ column: 'warehouse', isNull: true }];
      const result = applyDataFilters(mockRecords, filters, mockConfig);
      
      expect(result).toHaveLength(1);
      expect(result[0].item_number).toBe(101);
    });
  });

  describe('isDateString', () => {
    it('should identify valid date strings', () => {
      expect(isDateString('2023-12-25')).toBe(true);
      expect(isDateString('2024-01-01')).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(isDateString('not-a-date')).toBe(false);
      expect(isDateString('2023/12/25')).toBe(false);
      expect(isDateString('25-12-2023')).toBe(false);
      expect(isDateString('2023-12')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isDateString(123)).toBe(false);
      expect(isDateString(null)).toBe(false);
      expect(isDateString(undefined)).toBe(false);
      expect(isDateString({})).toBe(false);
    });
  });
});
