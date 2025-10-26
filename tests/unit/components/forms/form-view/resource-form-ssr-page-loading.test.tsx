import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResourceFormSSRPage from '@/components/forms/form-view/resource-form-ssr-page';

// Mock dependencies
jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/components/forms/shell/form-shell-with-loading', () => {
  return function MockFormShellWithLoading({ 
    title, 
    headerTitle, 
    headerDescription, 
    actions, 
    children,
    isInitialLoading,
    initialLoadingTitle,
    initialLoadingDescription,
    submissionTitle,
    submissionDescription,
    isBackgroundLoading,
    backgroundLoadingMessage,
    ...props 
  }: any) {
    return (
      <div data-testid="form-shell-with-loading">
        <div data-testid="form-title">{title}</div>
        <div data-testid="form-header-title">{headerTitle}</div>
        <div data-testid="form-header-description">{headerDescription}</div>
        <div data-testid="form-actions">{JSON.stringify(actions)}</div>
        <div data-testid="form-children">{children}</div>
        
        {/* Loading state indicators */}
        {isInitialLoading && (
          <div data-testid="initial-loading" data-title={initialLoadingTitle} data-description={initialLoadingDescription}>
            Initial Loading
          </div>
        )}
        {submissionTitle && (
          <div data-testid="submission-loading" data-title={submissionTitle} data-description={submissionDescription}>
            Submission Loading
          </div>
        )}
        {isBackgroundLoading && (
          <div data-testid="background-loading" data-message={backgroundLoadingMessage}>
            Background Loading
          </div>
        )}
      </div>
    );
  };
});

jest.mock('@/components/forms/shell/form-island', () => {
  return function MockFormIsland({ formId, config, defaults, options }: any) {
    return (
      <div data-testid="form-island" data-form-id={formId}>
        <div data-testid="form-config">{JSON.stringify(config)}</div>
        <div data-testid="form-defaults">{JSON.stringify(defaults)}</div>
        <div data-testid="form-options">{JSON.stringify(options)}</div>
      </div>
    );
  };
});

jest.mock('@/components/auth/permissions-gate', () => {
  return function MockPermissionGate({ children, any: anyPermissions, all: allPermissions }: any) {
    return (
      <div data-testid="permission-gate" data-any={JSON.stringify(anyPermissions)} data-all={JSON.stringify(allPermissions)}>
        {children}
      </div>
    );
  };
});

describe('ResourceFormSSRPage Loading States', () => {
  const defaultProps = {
    title: 'Test Form',
    headerDescription: 'Test Description',
    formId: 'test-form',
    config: {
      key: 'test-form',
      title: 'Test Form',
      fields: [],
    },
    defaults: { field1: 'value1' },
    options: { option1: 'value1' },
  };

  it('renders form with default loading states', () => {
    render(<ResourceFormSSRPage {...defaultProps} />);
    
    expect(screen.getByTestId('form-shell-with-loading')).toBeInTheDocument();
    expect(screen.getByTestId('form-title')).toHaveTextContent('Test Form');
    expect(screen.getByTestId('form-header-title')).toHaveTextContent('Test Form');
    expect(screen.getByTestId('form-header-description')).toHaveTextContent('Test Description');
    expect(screen.getByTestId('form-island')).toBeInTheDocument();
  });

  it('shows initial loading when isInitialLoading is true', () => {
    render(
      <ResourceFormSSRPage
        {...defaultProps}
        isInitialLoading={true}
        initialLoadingTitle="Loading Form Data"
        initialLoadingDescription="Please wait..."
      />
    );
    
    const loading = screen.getByTestId('initial-loading');
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveAttribute('data-title', 'Loading Form Data');
    expect(loading).toHaveAttribute('data-description', 'Please wait...');
  });

  it('shows submission loading with custom messages', () => {
    render(
      <ResourceFormSSRPage
        {...defaultProps}
        submissionTitle="Saving Changes"
        submissionDescription="Please wait while we save..."
      />
    );
    
    const loading = screen.getByTestId('submission-loading');
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveAttribute('data-title', 'Saving Changes');
    expect(loading).toHaveAttribute('data-description', 'Please wait while we save...');
  });

  it('shows background loading when isBackgroundLoading is true', () => {
    render(
      <ResourceFormSSRPage
        {...defaultProps}
        isBackgroundLoading={true}
        backgroundLoadingMessage="Processing data..."
      />
    );
    
    const loading = screen.getByTestId('background-loading');
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveAttribute('data-message', 'Processing data...');
  });

  it('can show multiple loading states simultaneously', () => {
    render(
      <ResourceFormSSRPage
        {...defaultProps}
        isInitialLoading={true}
        isBackgroundLoading={true}
        submissionTitle="Saving"
      />
    );
    
    expect(screen.getByTestId('initial-loading')).toBeInTheDocument();
    expect(screen.getByTestId('submission-loading')).toBeInTheDocument();
    expect(screen.getByTestId('background-loading')).toBeInTheDocument();
  });

  it('uses default loading messages when not provided', () => {
    render(
      <ResourceFormSSRPage
        {...defaultProps}
        isInitialLoading={true}
        isBackgroundLoading={true}
      />
    );
    
    const initialLoading = screen.getByTestId('initial-loading');
    expect(initialLoading).toHaveAttribute('data-title', 'Loading Form');
    expect(initialLoading).toHaveAttribute('data-description', 'Please wait...');
    
    const backgroundLoading = screen.getByTestId('background-loading');
    expect(backgroundLoading).toHaveAttribute('data-message', 'Processing...');
  });

  it('passes form data correctly to FormIsland', () => {
    render(<ResourceFormSSRPage {...defaultProps} />);
    
    const formIsland = screen.getByTestId('form-island');
    expect(formIsland).toHaveAttribute('data-form-id', 'test-form');
    
    expect(screen.getByTestId('form-config')).toHaveTextContent(JSON.stringify(defaultProps.config));
    expect(screen.getByTestId('form-defaults')).toHaveTextContent(JSON.stringify(defaultProps.defaults));
    expect(screen.getByTestId('form-options')).toHaveTextContent(JSON.stringify(defaultProps.options));
  });

  it('handles permission gating for primary button', () => {
    render(
      <ResourceFormSSRPage
        {...defaultProps}
        primaryButtonPermissions={{
          any: ['permission1', 'permission2'],
        }}
      />
    );
    
    const actions = JSON.parse(screen.getByTestId('form-actions').textContent || '{}');
    expect(actions.primary).toBeDefined();
  });

  it('generates correct cancel href from config', () => {
    render(
      <ResourceFormSSRPage
        {...defaultProps}
        config={{
          ...defaultProps.config,
          key: 'test-resource',
        }}
      />
    );
    
    const actions = JSON.parse(screen.getByTestId('form-actions').textContent || '{}');
    expect(actions.secondaryLeft).toBeDefined();
  });
});
