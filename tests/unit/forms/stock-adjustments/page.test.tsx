import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NextRequest } from 'next/server'
import StockAdjustmentsPage from '@/app/(main)/forms/stock-adjustments/page'

// Mock the data fetching
vi.mock('@/lib/data/resource-fetch', () => ({
  fetchResourcePage: vi.fn()
}))

// Mock the components
vi.mock('@/components/forms/resource-view/resource-table-client', () => ({
  default: ({ config, initialRows, initialTotal, page, pageSize }: any) => (
    <div data-testid="resource-table">
      <div data-testid="table-config">{JSON.stringify(config)}</div>
      <div data-testid="table-rows">{initialRows.length}</div>
      <div data-testid="table-total">{initialTotal}</div>
      <div data-testid="table-page">{page}</div>
      <div data-testid="table-page-size">{pageSize}</div>
    </div>
  )
}))

vi.mock('@/components/forms/shell/page-shell', () => ({
  default: ({ title, count, children, ...props }: any) => (
    <div data-testid="page-shell">
      <h1 data-testid="page-title">{title}</h1>
      <div data-testid="page-count">{count}</div>
      <div data-testid="page-props">{JSON.stringify(props)}</div>
      {children}
    </div>
  )
}))

// Mock the configs
vi.mock('@/app/(main)/forms/stock-adjustments/toolbar.config', () => ({
  stockAdjustmentsToolbar: { left: [], right: [] },
  stockAdjustmentsChips: undefined,
  stockAdjustmentsActions: {}
}))

vi.mock('@/app/(main)/forms/stock-adjustments/view.config', () => ({
  stockAdjustmentsViewConfig: {
    resourceKeyForDelete: 'tcm_user_tally_card_entries',
    formsRouteSegment: 'stock-adjustments',
    idField: 'id',
    buildColumns: () => []
  }
}))

describe('Stock Adjustments Page', () => {
  const mockData = {
    rows: [
      {
        id: '1',
        user_id: 'user-1',
        full_name: 'John Doe',
        warehouse: 'WH-001',
        tally_card_number: 'TC-001',
        card_uid: 'card-1',
        qty: 10,
        location: 'A1-B2',
        note: 'Test note',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        user_id: 'user-2',
        full_name: 'Jane Smith',
        warehouse: 'WH-002',
        tally_card_number: 'TC-002',
        card_uid: 'card-2',
        qty: 5,
        location: 'B1-C2',
        note: 'Another note',
        updated_at: '2024-01-02T00:00:00Z'
      }
    ],
    total: 2
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful data fetch
    const { fetchResourcePage } = require('@/lib/data/resource-fetch')
    fetchResourcePage.mockResolvedValue(mockData)
  })

  it('should render the page with correct title', async () => {
    const props = { searchParams: {} }
    const component = await StockAdjustmentsPage(props)
    const { container } = render(component)

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Stock Adjustments')
    })
  })

  it('should pass correct props to PageShell', async () => {
    const props = { searchParams: {} }
    const component = await StockAdjustmentsPage(props)
    const { container } = render(component)

    await waitFor(() => {
      const pageProps = screen.getByTestId('page-props')
      const parsedProps = JSON.parse(pageProps.textContent || '{}')
      
      expect(parsedProps).toMatchObject({
        count: 2,
        enableAdvancedFilters: true,
        showSaveViewButton: false,
        showToolbarContainer: false
      })
    })
  })

  it('should pass correct data to ResourceTableClient', async () => {
    const props = { searchParams: {} }
    const component = await StockAdjustmentsPage(props)
    const { container } = render(component)

    await waitFor(() => {
      expect(screen.getByTestId('table-rows')).toHaveTextContent('2')
      expect(screen.getByTestId('table-total')).toHaveTextContent('2')
      expect(screen.getByTestId('table-page')).toHaveTextContent('1')
      expect(screen.getByTestId('table-page-size')).toHaveTextContent('10')
    })
  })

  it('should handle pagination parameters', async () => {
    const props = { 
      searchParams: { 
        page: '2', 
        pageSize: '5' 
      } 
    }
    const component = await StockAdjustmentsPage(props)
    const { container } = render(component)

    await waitFor(() => {
      expect(screen.getByTestId('table-page')).toHaveTextContent('2')
      expect(screen.getByTestId('table-page-size')).toHaveTextContent('5')
    })
  })

  it('should transform data correctly', async () => {
    const props = { searchParams: {} }
    const component = await StockAdjustmentsPage(props)
    const { container } = render(component)

    await waitFor(() => {
      const { fetchResourcePage } = require('@/lib/data/resource-fetch')
      expect(fetchResourcePage).toHaveBeenCalledWith({
        endpoint: '/api/v_tcm_user_tally_card_entries',
        page: 1,
        pageSize: 10,
        extraQuery: { raw: 'true' }
      })
    })
  })

  it('should handle empty data gracefully', async () => {
    const { fetchResourcePage } = require('@/lib/data/resource-fetch')
    fetchResourcePage.mockResolvedValue({ rows: [], total: 0 })

    const props = { searchParams: {} }
    const component = await StockAdjustmentsPage(props)
    const { container } = render(component)

    await waitFor(() => {
      expect(screen.getByTestId('table-rows')).toHaveTextContent('0')
      expect(screen.getByTestId('table-total')).toHaveTextContent('0')
    })
  })

  it('should handle API errors gracefully', async () => {
    const { fetchResourcePage } = require('@/lib/data/resource-fetch')
    fetchResourcePage.mockRejectedValue(new Error('API Error'))

    const props = { searchParams: {} }
    const component = await StockAdjustmentsPage(props)
    const { container } = render(component)

    await waitFor(() => {
      expect(screen.getByTestId('table-rows')).toHaveTextContent('0')
      expect(screen.getByTestId('table-total')).toHaveTextContent('0')
    })
  })
})
