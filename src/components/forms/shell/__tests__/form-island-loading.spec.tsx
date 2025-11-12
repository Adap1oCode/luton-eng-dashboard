import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import FormIsland from '@/components/forms/shell/form-island';
import { AppLoaderProvider } from '@/components/providers/app-loader-provider';
import AppLoaderOverlay from '@/components/common/app-loader-overlay';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/components/ui/notice', () => ({
  useNotice: () => ({
    open: vi.fn(),
  }),
}));

vi.mock('@/components/forms/dynamic-form', () => ({
  DynamicForm: function MockDynamicForm({ onSubmit }: any) {
    return (
      <form data-testid="dynamic-form" onSubmit={(e) => { e.preventDefault(); onSubmit({}); }}>
        <div data-testid="form-content">Dynamic Form Content</div>
        <button type="submit">Submit</button>
      </form>
    );
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

describe('FormIsland Loading States', () => {
  const defaultProps = {
    config: {
      key: 'test-form',
      title: 'Test Form',
      fields: [],
    },
    defaults: {},
    options: {},
    formId: 'test-form',
  };

  it('renders DynamicForm without loader by default', () => {
    renderWithProviders(<FormIsland {...defaultProps} />);

    expect(screen.getByTestId('dynamic-form')).toBeInTheDocument();
    expect(screen.queryByTestId('app-loader-background')).not.toBeInTheDocument();
  });

  it('shows field loading indicator when isFieldLoading is true', async () => {
    renderWithProviders(
      <FormIsland
        {...defaultProps}
        isFieldLoading={true}
        fieldLoadingMessage="Loading options..."
      />
    );

    const loader = await screen.findByTestId('app-loader-background');
    expect(loader).toHaveTextContent('Loading options...');
  });

  it('shows auto-save indicator when isAutoSaving is true', async () => {
    renderWithProviders(
      <FormIsland
        {...defaultProps}
        isAutoSaving={true}
        autoSaveMessage="Saving draft..."
      />
    );

    const loader = await screen.findByTestId('app-loader-background');
    expect(loader).toHaveTextContent('Saving draft...');
  });

  it('shows validation indicator when isValidating is true', async () => {
    renderWithProviders(
      <FormIsland
        {...defaultProps}
        isValidating={true}
        validationMessage="Validating..."
      />
    );

    const loader = await screen.findByTestId('app-loader-background');
    expect(loader).toHaveTextContent('Validating...');
  });

  it('updates overlay content as different loaders trigger', async () => {
    const { rerender } = renderWithProviders(
      <FormIsland
        {...defaultProps}
        isFieldLoading={true}
        fieldLoadingMessage="Loading options..."
      />
    );

    await screen.findByTestId('app-loader-background');

    rerender(
      wrapWithLoader(
        <FormIsland
          {...defaultProps}
          isAutoSaving={true}
          autoSaveMessage="Saving draft..."
        />
      )
    );

    await waitFor(() => {
      const loader = screen.getByTestId('app-loader-background');
      expect(loader).toHaveTextContent('Saving draft...');
    });
  });

  it('hides overlay when loading finishes', async () => {
    const { rerender } = renderWithProviders(
      <FormIsland
        {...defaultProps}
        isFieldLoading={true}
        fieldLoadingMessage="Loading options..."
      />
    );

    await screen.findByTestId('app-loader-background');

    rerender(wrapWithLoader(<FormIsland {...defaultProps} isFieldLoading={false} />));

    await waitFor(() => {
      expect(screen.queryByTestId('app-loader-background')).not.toBeInTheDocument();
    });
  });
});
