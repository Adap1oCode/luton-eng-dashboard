import { render, screen } from '@testing-library/react';
import InventoryPage from '../page';
import { getInventorySummary } from '@/lib/data/resources/dashboards/inventory-summary';

// Mock the data function
jest.mock('@/lib/data/resources/dashboards/inventory-summary', () => ({
  getInventorySummary: jest.fn(),
}));

// Mock the GenericDashboardPage component
jest.mock('@/components/dashboard/page', () => {
  return function MockGenericDashboardPage({ config }: { config: any }) {
    return (
      <div data-testid="dashboard">
        <div data-testid="summary-cards">
          {config.summary?.map((tile: any) => (
            <div key={tile.key} data-testid={`summary-card-${tile.key}`}>
              <span data-testid={`title-${tile.key}`}>{tile.title}</span>
              <span data-testid={`value-${tile.key}`}>{tile.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
});

describe('InventoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display correct summary values from API data', async () => {
    // Mock the summary data that matches the API response
    const mockSummaryData = {
      total_inventory_records: 3294,
      unique_item_count: 2807,
      total_available_stock: 1214629,
      total_on_order_quantity: 126040,
      total_committed_quantity: 142494,
      out_of_stock_count: 883,
      total_on_order_value: 1370547.36,
      total_inventory_value: 31688737.845,
      total_committed_value: 770662.55
    };

    (getInventorySummary as jest.Mock).mockResolvedValueOnce(mockSummaryData);

    const component = await InventoryPage();
    render(component);

    // Verify that the summary cards display the correct values
    expect(screen.getByTestId('value-totalInventoryRecords')).toHaveTextContent('3294');
    expect(screen.getByTestId('value-uniqueItems')).toHaveTextContent('2807');
    expect(screen.getByTestId('value-totalAvailableStock')).toHaveTextContent('1214629');
    expect(screen.getByTestId('value-totalOnOrderQuantity')).toHaveTextContent('126040');
    expect(screen.getByTestId('value-totalCommittedQuantity')).toHaveTextContent('142494');
    expect(screen.getByTestId('value-outOfStockCount')).toHaveTextContent('883');
    expect(screen.getByTestId('value-totalOnOrderValue')).toHaveTextContent('1370547.36');
    expect(screen.getByTestId('value-totalInventoryValue')).toHaveTextContent('31688737.845');
    expect(screen.getByTestId('value-totalCommittedValue')).toHaveTextContent('770662.55');
  });

  it('should handle zero values when API returns zeros', async () => {
    // Mock the summary data with zeros
    const mockSummaryData = {
      total_inventory_records: 0,
      unique_item_count: 0,
      total_available_stock: 0,
      total_on_order_quantity: 0,
      total_committed_quantity: 0,
      out_of_stock_count: 0,
      total_on_order_value: 0,
      total_inventory_value: 0,
      total_committed_value: 0
    };

    (getInventorySummary as jest.Mock).mockResolvedValueOnce(mockSummaryData);

    const component = await InventoryPage();
    render(component);

    // Verify that all values are zero
    expect(screen.getByTestId('value-totalInventoryRecords')).toHaveTextContent('0');
    expect(screen.getByTestId('value-uniqueItems')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalAvailableStock')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalOnOrderQuantity')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalCommittedQuantity')).toHaveTextContent('0');
    expect(screen.getByTestId('value-outOfStockCount')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalOnOrderValue')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalInventoryValue')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalCommittedValue')).toHaveTextContent('0');
  });

  it('should handle missing data gracefully', async () => {
    // Mock the summary data with some missing fields
    const mockSummaryData = {
      total_inventory_records: 100,
      unique_item_count: 50,
      // Missing other fields
    };

    (getInventorySummary as jest.Mock).mockResolvedValueOnce(mockSummaryData);

    const component = await InventoryPage();
    render(component);

    // Verify that existing values are displayed and missing ones default to 0
    expect(screen.getByTestId('value-totalInventoryRecords')).toHaveTextContent('100');
    expect(screen.getByTestId('value-uniqueItems')).toHaveTextContent('50');
    expect(screen.getByTestId('value-totalAvailableStock')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalOnOrderQuantity')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalCommittedQuantity')).toHaveTextContent('0');
    expect(screen.getByTestId('value-outOfStockCount')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalOnOrderValue')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalInventoryValue')).toHaveTextContent('0');
    expect(screen.getByTestId('value-totalCommittedValue')).toHaveTextContent('0');
  });
});

