import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import PageShellWithLoading from '@/components/forms/shell/page-shell-with-loading';
import { AppLoaderProvider } from '@/components/providers/app-loader-provider';
import AppLoaderOverlay from '@/components/common/app-loader-overlay';

vi.mock('@/components/forms/shell/page-shell', () => ({
  default: function MockPageShell({ children }: { children: React.ReactNode }) {
    return <div data-testid="page-shell">{children}</div>;
  },
}));

const wrapWithLoader = (ui: React.ReactNode) => (
  <AppLoaderProvider>
    <>
      {ui}
      <AppLoaderOverlay />
    </>
  </AppLoaderProvider>
);

const renderWithProviders = (ui: React.ReactNode) => render(wrapWithLoader(ui));

beforeEach(() => {
  sessionStorage.setItem("__app_loader_bootstrap__", "1");
});

describe('PageShellWithLoading', () => {
  const defaultProps = {
    title: 'Test Page',
    children: <div data-testid="page-content">Page Content</div>,
  };

  it('renders PageShell with children and no loaders by default', () => {
    renderWithProviders(<PageShellWithLoading {...defaultProps} />);

    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-loader-blocking')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-loader-background')).not.toBeInTheDocument();
  });

  it('shows blocking loader when isLoading is true', async () => {
    renderWithProviders(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={true}
        loadingTitle="Loading Page"
        loadingDescription="Please wait..."
      />
    );

    const loader = await screen.findByTestId('app-loader-blocking');
    expect(loader).toHaveTextContent('Loading Page');
    expect(loader).toHaveTextContent('Please wait...');
  });

  it('shows background loader when isRefetching is true', async () => {
    renderWithProviders(
      <PageShellWithLoading
        {...defaultProps}
        isRefetching={true}
        refetchMessage="Updating..."
      />
    );

    const loader = await screen.findByTestId('app-loader-background');
    expect(loader).toHaveTextContent('Updating...');
  });

  it('updates loader when props change', async () => {
    const { rerender } = renderWithProviders(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={true}
        loadingTitle="Loading Page"
        loadingDescription="Please wait..."
      />
    );

    await screen.findByTestId('app-loader-blocking');

    rerender(
      wrapWithLoader(
        <PageShellWithLoading
          {...defaultProps}
          isLoading={true}
          loadingTitle="Still loading"
          loadingDescription="Almost done..."
        />
      )
    );

    await waitFor(() => {
      const loader = screen.getByTestId('app-loader-blocking');
      expect(loader).toHaveTextContent('Still loading');
      expect(loader).toHaveTextContent('Almost done...');
    });
  });

  it('hides loaders when flags are cleared', async () => {
    const { rerender } = renderWithProviders(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={true}
        loadingTitle="Loading Page"
      />
    );

    await screen.findByTestId('app-loader-blocking');

    rerender(wrapWithLoader(<PageShellWithLoading {...defaultProps} isLoading={false} />));

    await waitFor(() => {
      expect(screen.queryByTestId('app-loader-blocking')).not.toBeInTheDocument();
    });
  });

  it('passes PageShell props correctly', () => {
    const propsWithConfig = {
      ...defaultProps,
      count: 42,
      toolbarConfig: { filters: [] },
      toolbarActions: { primary: <button>Do</button> },
    };

    renderWithProviders(<PageShellWithLoading {...propsWithConfig} />);

    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
  });
});
