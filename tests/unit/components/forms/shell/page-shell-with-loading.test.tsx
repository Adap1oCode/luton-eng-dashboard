import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PageShellWithLoading from '@/components/forms/shell/page-shell-with-loading';
import { FullScreenLoader } from '@/components/ui/enhanced-loader';
import { BackgroundLoader } from '@/components/ui/background-loader';

// Mock the child components
jest.mock('@/components/forms/shell/page-shell', () => {
  return function MockPageShell({ children }: { children: React.ReactNode }) {
    return <div data-testid="page-shell">{children}</div>;
  };
});

jest.mock('@/components/ui/enhanced-loader', () => ({
  FullScreenLoader: ({ title, description, size }: any) => (
    <div data-testid="fullscreen-loader" data-title={title} data-description={description} data-size={size}>
      FullScreen Loader
    </div>
  ),
}));

jest.mock('@/components/ui/background-loader', () => ({
  BackgroundLoader: ({ message, position, size }: any) => (
    <div data-testid="background-loader" data-message={message} data-position={position} data-size={size}>
      Background Loader
    </div>
  ),
}));

describe('PageShellWithLoading', () => {
  const defaultProps = {
    title: 'Test Page',
    children: <div data-testid="page-content">Page Content</div>,
  };

  it('renders PageShell with children', () => {
    render(<PageShellWithLoading {...defaultProps} />);
    
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('shows initial loading when isLoading is true', () => {
    render(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={true}
        loadingTitle="Loading Page"
        loadingDescription="Please wait..."
      />
    );
    
    const loader = screen.getByTestId('fullscreen-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-title', 'Loading Page');
    expect(loader).toHaveAttribute('data-description', 'Please wait...');
    expect(loader).toHaveAttribute('data-size', 'md');
  });

  it('shows background loading when isRefetching is true', () => {
    render(
      <PageShellWithLoading
        {...defaultProps}
        isRefetching={true}
        refetchMessage="Updating..."
        refetchPosition="top-right"
      />
    );
    
    const loader = screen.getByTestId('background-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-message', 'Updating...');
    expect(loader).toHaveAttribute('data-position', 'top-right');
    expect(loader).toHaveAttribute('data-size', 'md');
  });

  it('can show both loading states simultaneously', () => {
    render(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={true}
        isRefetching={true}
      />
    );
    
    expect(screen.getByTestId('fullscreen-loader')).toBeInTheDocument();
    expect(screen.getByTestId('background-loader')).toBeInTheDocument();
  });

  it('uses default loading messages when not provided', () => {
    render(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={true}
        isRefetching={true}
      />
    );
    
    const fullscreenLoader = screen.getByTestId('fullscreen-loader');
    expect(fullscreenLoader).toHaveAttribute('data-title', 'Loading...');
    expect(fullscreenLoader).toHaveAttribute('data-description', 'Please wait...');
    
    const backgroundLoader = screen.getByTestId('background-loader');
    expect(backgroundLoader).toHaveAttribute('data-message', 'Updating...');
    expect(backgroundLoader).toHaveAttribute('data-position', 'top-right');
  });

  it('passes all PageShell props correctly', () => {
    const propsWithActions = {
      ...defaultProps,
      count: 100,
      toolbarConfig: { filters: [] },
      toolbarActions: { primary: <button>Action</button> },
      enableAdvancedFilters: true,
    };

    render(<PageShellWithLoading {...propsWithActions} />);
    
    // PageShell should receive all the props
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
  });

  it('handles custom loading titles and descriptions', () => {
    render(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={true}
        loadingTitle="Custom Loading Title"
        loadingDescription="Custom loading description"
      />
    );
    
    const loader = screen.getByTestId('fullscreen-loader');
    expect(loader).toHaveAttribute('data-title', 'Custom Loading Title');
    expect(loader).toHaveAttribute('data-description', 'Custom loading description');
  });

  it('handles custom refetch messages and positions', () => {
    render(
      <PageShellWithLoading
        {...defaultProps}
        isRefetching={true}
        refetchMessage="Custom refetch message"
        refetchPosition="bottom-left"
      />
    );
    
    const loader = screen.getByTestId('background-loader');
    expect(loader).toHaveAttribute('data-message', 'Custom refetch message');
    expect(loader).toHaveAttribute('data-position', 'bottom-left');
  });

  it('does not show loaders when loading states are false', () => {
    render(
      <PageShellWithLoading
        {...defaultProps}
        isLoading={false}
        isRefetching={false}
      />
    );
    
    expect(screen.queryByTestId('fullscreen-loader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('background-loader')).not.toBeInTheDocument();
  });

  it('renders without loading props', () => {
    render(<PageShellWithLoading {...defaultProps} />);
    
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.queryByTestId('fullscreen-loader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('background-loader')).not.toBeInTheDocument();
  });
});
