import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BackgroundLoader } from '@/components/ui/background-loader';

describe('BackgroundLoader', () => {
  it('renders with default props', () => {
    render(<BackgroundLoader />);
    
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<BackgroundLoader message="Custom message" />);
    
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<BackgroundLoader size="sm" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    rerender(<BackgroundLoader size="md" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    rerender(<BackgroundLoader size="lg" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('renders with different positions', () => {
    const { rerender } = render(<BackgroundLoader position="top-right" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    rerender(<BackgroundLoader position="top-left" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    rerender(<BackgroundLoader position="bottom-right" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    rerender(<BackgroundLoader position="bottom-left" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    rerender(<BackgroundLoader position="top-center" />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<BackgroundLoader className="custom-class" />);
    
    const loader = screen.getByRole('status');
    expect(loader).toHaveClass('custom-class');
  });

  it('shows spinner and message together', () => {
    render(<BackgroundLoader message="Processing..." />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    // Check for spinner (element with animate-spin class)
    const spinner = screen.getByText('Processing...').parentElement?.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has proper positioning classes', () => {
    const { rerender } = render(<BackgroundLoader position="top-right" />);
    let loader = screen.getByRole('status');
    expect(loader).toHaveClass('top-4', 'right-4');
    
    rerender(<BackgroundLoader position="top-left" />);
    loader = screen.getByRole('status');
    expect(loader).toHaveClass('top-4', 'left-4');
    
    rerender(<BackgroundLoader position="bottom-right" />);
    loader = screen.getByRole('status');
    expect(loader).toHaveClass('bottom-4', 'right-4');
    
    rerender(<BackgroundLoader position="bottom-left" />);
    loader = screen.getByRole('status');
    expect(loader).toHaveClass('bottom-4', 'left-4');
    
    rerender(<BackgroundLoader position="top-center" />);
    loader = screen.getByRole('status');
    expect(loader).toHaveClass('top-4', 'left-1/2', 'transform', '-translate-x-1/2');
  });

  it('has proper size classes', () => {
    const { rerender } = render(<BackgroundLoader size="sm" />);
    let container = screen.getByText('Updating...').closest('.bg-white');
    expect(container).toHaveClass('p-2');
    
    rerender(<BackgroundLoader size="md" />);
    container = screen.getByText('Updating...').closest('.bg-white');
    expect(container).toHaveClass('p-3');
    
    rerender(<BackgroundLoader size="lg" />);
    container = screen.getByText('Updating...').closest('.bg-white');
    expect(container).toHaveClass('p-4');
  });

  it('has proper z-index for overlay', () => {
    render(<BackgroundLoader />);
    
    const loader = screen.getByRole('status');
    expect(loader).toHaveClass('z-50');
  });

  it('has proper styling for container', () => {
    render(<BackgroundLoader />);
    
    const container = screen.getByText('Updating...').closest('.bg-white');
    expect(container).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'border');
  });

  it('has proper text styling', () => {
    render(<BackgroundLoader message="Test message" />);
    
    const text = screen.getByText('Test message');
    expect(text).toHaveClass('text-gray-700');
  });

  it('has proper spinner styling', () => {
    render(<BackgroundLoader />);
    
    const spinner = screen.getByText('Updating...').parentElement?.querySelector('.animate-spin');
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-2', 'border-blue-600');
  });

  it('renders multiple instances without conflicts', () => {
    render(
      <div>
        <BackgroundLoader message="Loader 1" position="top-right" />
        <BackgroundLoader message="Loader 2" position="top-left" />
        <BackgroundLoader message="Loader 3" position="bottom-right" />
      </div>
    );
    
    expect(screen.getByText('Loader 1')).toBeInTheDocument();
    expect(screen.getByText('Loader 2')).toBeInTheDocument();
    expect(screen.getByText('Loader 3')).toBeInTheDocument();
  });

  it('handles long messages gracefully', () => {
    const longMessage = 'This is a very long message that should be handled gracefully by the background loader component';
    render(<BackgroundLoader message={longMessage} />);
    
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('handles empty message gracefully', () => {
    render(<BackgroundLoader message="" />);
    
    // Should still render the component structure
    const loader = screen.getByRole('status');
    expect(loader).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<BackgroundLoader message="Processing data" />);
    
    // Should be accessible to screen readers
    const text = screen.getByText('Processing data');
    expect(text).toBeInTheDocument();
  });
});
