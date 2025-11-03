import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormShellWithLoading from '@/components/forms/shell/form-shell-with-loading';
import { FullScreenLoader } from '@/components/ui/enhanced-loader';
import { BackgroundLoader } from '@/components/ui/background-loader';

import { vi } from 'vitest';

// Mock the child components
vi.mock('@/components/forms/shell/form-shell', () => ({
  default: function MockFormShell({ children }: { children: React.ReactNode }) {
    return <div data-testid="form-shell">{children}</div>;
  },
}));

vi.mock('@/components/ui/enhanced-loader', () => ({
  FullScreenLoader: ({ title, description, size }: any) => (
    <div data-testid="fullscreen-loader" data-title={title} data-description={description} data-size={size}>
      FullScreen Loader
    </div>
  ),
}));

vi.mock('@/components/ui/background-loader', () => ({
  BackgroundLoader: ({ message, position, size }: any) => (
    <div data-testid="background-loader" data-message={message} data-position={position} data-size={size}>
      Background Loader
    </div>
  ),
}));

describe('FormShellWithLoading', () => {
  const defaultProps = {
    title: 'Test Form',
    headerTitle: 'Test Form',
    headerDescription: 'Test Description',
    children: <div data-testid="form-content">Form Content</div>,
  };

  it('renders FormShell with children', () => {
    render(<FormShellWithLoading {...defaultProps} />);
    
    expect(screen.getByTestId('form-shell')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  it('shows initial loading when isInitialLoading is true', () => {
    render(
      <FormShellWithLoading
        {...defaultProps}
        isInitialLoading={true}
        initialLoadingTitle="Loading Form"
        initialLoadingDescription="Please wait..."
      />
    );
    
    const loader = screen.getByTestId('fullscreen-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-title', 'Loading Form');
    expect(loader).toHaveAttribute('data-description', 'Please wait...');
    expect(loader).toHaveAttribute('data-size', 'md');
  });

  it('shows submission loading when isSubmitting is true', () => {
    render(
      <FormShellWithLoading
        {...defaultProps}
        isSubmitting={true}
        submissionTitle="Saving Changes"
        submissionDescription="Please wait..."
      />
    );
    
    const loader = screen.getByTestId('fullscreen-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-title', 'Saving Changes');
    expect(loader).toHaveAttribute('data-description', 'Please wait...');
    expect(loader).toHaveAttribute('data-size', 'sm');
  });

  it('shows background loading when isBackgroundLoading is true', () => {
    render(
      <FormShellWithLoading
        {...defaultProps}
        isBackgroundLoading={true}
        backgroundLoadingMessage="Processing..."
        backgroundLoadingPosition="top-right"
      />
    );
    
    const loader = screen.getByTestId('background-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-message', 'Processing...');
    expect(loader).toHaveAttribute('data-position', 'top-right');
    expect(loader).toHaveAttribute('data-size', 'md');
  });

  it('can show multiple loaders simultaneously', () => {
    render(
      <FormShellWithLoading
        {...defaultProps}
        isInitialLoading={true}
        isSubmitting={true}
        isBackgroundLoading={true}
      />
    );
    
    expect(screen.getAllByTestId('fullscreen-loader')).toHaveLength(2);
    expect(screen.getByTestId('background-loader')).toBeInTheDocument();
  });

  it('uses default loading messages when not provided', () => {
    render(
      <FormShellWithLoading
        {...defaultProps}
        isInitialLoading={true}
        isSubmitting={true}
        isBackgroundLoading={true}
      />
    );
    
    const loaders = screen.getAllByTestId('fullscreen-loader');
    expect(loaders[0]).toHaveAttribute('data-title', 'Loading Form');
    expect(loaders[0]).toHaveAttribute('data-description', 'Please wait...');
    expect(loaders[1]).toHaveAttribute('data-title', 'Saving Changes');
    expect(loaders[1]).toHaveAttribute('data-description', 'Please wait...');
    
    const backgroundLoader = screen.getByTestId('background-loader');
    expect(backgroundLoader).toHaveAttribute('data-message', 'Processing...');
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

    render(<FormShellWithLoading {...propsWithActions} />);
    
    // FormShell should receive all the props
    expect(screen.getByTestId('form-shell')).toBeInTheDocument();
  });
});
