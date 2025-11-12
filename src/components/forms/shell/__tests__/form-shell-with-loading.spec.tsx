import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import FormShellWithLoading from '@/components/forms/shell/form-shell-with-loading';
import { AppLoaderProvider } from '@/components/providers/app-loader-provider';
import AppLoaderOverlay from '@/components/common/app-loader-overlay';

vi.mock('@/components/forms/shell/form-shell', () => ({
  default: function MockFormShell({ children }: { children: React.ReactNode }) {
    return <div data-testid="form-shell">{children}</div>;
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

describe('FormShellWithLoading', () => {
  const defaultProps = {
    title: 'Test Form',
    headerTitle: 'Test Form',
    headerDescription: 'Test Description',
    children: <div data-testid="form-content">Form Content</div>,
  };

  it('renders FormShell with children and no loaders by default', () => {
    renderWithProviders(<FormShellWithLoading {...defaultProps} />);

    expect(screen.getByTestId('form-shell')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-loader-blocking')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-loader-background')).not.toBeInTheDocument();
  });

  it('shows initial loading when isInitialLoading is true', async () => {
    renderWithProviders(
      <FormShellWithLoading
        {...defaultProps}
        isInitialLoading={true}
        initialLoadingTitle="Loading Form"
        initialLoadingDescription="Please wait..."
      />
    );

    const loader = await screen.findByTestId('app-loader-blocking');
    expect(loader).toHaveTextContent('Loading Form');
    expect(loader).toHaveTextContent('Please wait...');
  });

  it('shows submission loading when isSubmitting is true', async () => {
    renderWithProviders(
      <FormShellWithLoading
        {...defaultProps}
        isSubmitting={true}
        submissionTitle="Saving Changes"
        submissionDescription="Please wait..."
      />
    );

    const loader = await screen.findByTestId('app-loader-blocking');
    expect(loader).toHaveTextContent('Saving Changes');
    expect(loader).toHaveTextContent('Please wait...');
  });

  it('shows background loading when isBackgroundLoading is true', async () => {
    renderWithProviders(
      <FormShellWithLoading
        {...defaultProps}
        isBackgroundLoading={true}
        backgroundLoadingMessage="Processing..."
      />
    );

    const loader = await screen.findByTestId('app-loader-background');
    expect(loader).toHaveTextContent('Processing...');
  });

  it('updates loader content when props change', async () => {
    const { rerender } = renderWithProviders(
      <FormShellWithLoading
        {...defaultProps}
        isInitialLoading={true}
        initialLoadingTitle="Loading Form"
        initialLoadingDescription="Please wait..."
      />
    );

    await screen.findByTestId('app-loader-blocking');

    rerender(
      wrapWithLoader(
        <FormShellWithLoading
          {...defaultProps}
          isInitialLoading={true}
          initialLoadingTitle="Still loading"
          initialLoadingDescription="Almost there..."
        />
      )
    );

    await waitFor(() => {
      const loader = screen.getByTestId('app-loader-blocking');
      expect(loader).toHaveTextContent('Still loading');
      expect(loader).toHaveTextContent('Almost there...');
    });
  });

  it('hides loaders when flags are cleared', async () => {
    const { rerender } = renderWithProviders(
      <FormShellWithLoading
        {...defaultProps}
        isInitialLoading={true}
        initialLoadingTitle="Loading Form"
      />
    );

    await screen.findByTestId('app-loader-blocking');

    rerender(wrapWithLoader(<FormShellWithLoading {...defaultProps} isInitialLoading={false} />));

    await waitFor(() => {
      expect(screen.queryByTestId('app-loader-blocking')).not.toBeInTheDocument();
    });
  });

  it('passes all FormShell props correctly', () => {
    const propsWithActions = {
      ...defaultProps,
      actions: {
        primary: <button>Save</button>,
        secondaryLeft: <button>Cancel</button>,
      },
      stickyFooter: true,
      contentMaxWidthClassName: 'max-w-4xl',
    };

    renderWithProviders(<FormShellWithLoading {...propsWithActions} />);

    expect(screen.getByTestId('form-shell')).toBeInTheDocument();
  });
});
