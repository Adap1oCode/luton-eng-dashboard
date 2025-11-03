import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormIsland from '@/components/forms/shell/form-island';

import { vi } from 'vitest';

// Mock dependencies
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
  DynamicForm: function MockDynamicForm({ onSubmit, ...props }: any) {
    return (
      <form data-testid="dynamic-form" onSubmit={(e) => { e.preventDefault(); onSubmit({}); }}>
        <div data-testid="form-content">Dynamic Form Content</div>
        <button type="submit">Submit</button>
      </form>
    );
  },
}));

vi.mock('@/components/ui/background-loader', () => ({
  BackgroundLoader: ({ message, position, size }: any) => (
    <div data-testid="background-loader" data-message={message} data-position={position} data-size={size}>
      Background Loader
    </div>
  ),
}));

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

  it('renders DynamicForm without loading indicators by default', () => {
    render(<FormIsland {...defaultProps} />);
    
    expect(screen.getByTestId('dynamic-form')).toBeInTheDocument();
    expect(screen.queryByTestId('background-loader')).not.toBeInTheDocument();
  });

  it('shows field loading indicator when isFieldLoading is true', () => {
    render(
      <FormIsland
        {...defaultProps}
        isFieldLoading={true}
        fieldLoadingMessage="Loading options..."
      />
    );
    
    const loader = screen.getByTestId('background-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-message', 'Loading options...');
    expect(loader).toHaveAttribute('data-position', 'top-right');
    expect(loader).toHaveAttribute('data-size', 'sm');
  });

  it('shows auto-save indicator when isAutoSaving is true', () => {
    render(
      <FormIsland
        {...defaultProps}
        isAutoSaving={true}
        autoSaveMessage="Saving draft..."
      />
    );
    
    const loader = screen.getByTestId('background-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-message', 'Saving draft...');
    expect(loader).toHaveAttribute('data-position', 'bottom-right');
    expect(loader).toHaveAttribute('data-size', 'sm');
  });

  it('shows validation indicator when isValidating is true', () => {
    render(
      <FormIsland
        {...defaultProps}
        isValidating={true}
        validationMessage="Validating..."
      />
    );
    
    const loader = screen.getByTestId('background-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-message', 'Validating...');
    expect(loader).toHaveAttribute('data-position', 'top-center');
    expect(loader).toHaveAttribute('data-size', 'sm');
  });

  it('can show multiple loading indicators simultaneously', () => {
    render(
      <FormIsland
        {...defaultProps}
        isFieldLoading={true}
        isAutoSaving={true}
        isValidating={true}
      />
    );
    
    const loaders = screen.getAllByTestId('background-loader');
    expect(loaders).toHaveLength(3);
    
    expect(loaders[0]).toHaveAttribute('data-position', 'top-right');
    expect(loaders[1]).toHaveAttribute('data-position', 'bottom-right');
    expect(loaders[2]).toHaveAttribute('data-position', 'top-center');
  });

  it('uses default loading messages when not provided', () => {
    render(
      <FormIsland
        {...defaultProps}
        isFieldLoading={true}
        isAutoSaving={true}
        isValidating={true}
      />
    );
    
    const loaders = screen.getAllByTestId('background-loader');
    expect(loaders[0]).toHaveAttribute('data-message', 'Loading options...');
    expect(loaders[1]).toHaveAttribute('data-message', 'Saving draft...');
    expect(loaders[2]).toHaveAttribute('data-message', 'Validating...');
  });

  it('maintains form functionality while showing loading indicators', () => {
    render(
      <FormIsland
        {...defaultProps}
        isFieldLoading={true}
        isAutoSaving={true}
      />
    );
    
    // Form should still be functional
    expect(screen.getByTestId('dynamic-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
    
    // Loading indicators should be present
    expect(screen.getAllByTestId('background-loader')).toHaveLength(2);
  });
});
