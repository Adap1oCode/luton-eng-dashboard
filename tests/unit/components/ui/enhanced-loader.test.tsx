import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FullScreenLoader, OverlayLoader, InlineLoader } from '@/components/ui/enhanced-loader';

describe('Enhanced Loader Components', () => {
  describe('FullScreenLoader', () => {
    it('renders with default props', () => {
      render(<FullScreenLoader />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders with custom title and description', () => {
      render(
        <FullScreenLoader
          title="Custom Title"
          description="Custom Description"
        />
      );
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom Description')).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<FullScreenLoader size="sm" />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      rerender(<FullScreenLoader size="md" />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      rerender(<FullScreenLoader size="lg" />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows progress dots by default', () => {
      render(<FullScreenLoader />);
      
      // Progress dots should be visible
      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-bounce')
      );
      expect(dots).toHaveLength(3);
    });

    it('hides progress dots when showProgressDots is false', () => {
      render(<FullScreenLoader showProgressDots={false} />);
      
      // Progress dots should not be visible
      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-bounce')
      );
      expect(dots).toHaveLength(0);
    });

    it('applies custom className', () => {
      render(<FullScreenLoader className="custom-class" />);
      
      const loader = screen.getByText('Loading...').closest('div');
      expect(loader).toHaveClass('custom-class');
    });
  });

  describe('OverlayLoader', () => {
    it('renders with default props', () => {
      render(<OverlayLoader />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      render(
        <OverlayLoader
          title="Overlay Title"
          description="Overlay Description"
          size="lg"
        />
      );
      
      expect(screen.getByText('Overlay Title')).toBeInTheDocument();
      expect(screen.getByText('Overlay Description')).toBeInTheDocument();
    });
  });

  describe('InlineLoader', () => {
    it('renders with default props', () => {
      render(<InlineLoader />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      render(
        <InlineLoader
          title="Inline Title"
          description="Inline Description"
          size="sm"
        />
      );
      
      expect(screen.getByText('Inline Title')).toBeInTheDocument();
      expect(screen.getByText('Inline Description')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<FullScreenLoader title="Loading Data" />);
      
      const loader = screen.getByText('Loading Data').closest('div');
      expect(loader).toHaveAttribute('role', 'status');
      expect(loader).toHaveAttribute('aria-live', 'polite');
    });

    it('announces loading state to screen readers', () => {
      render(<FullScreenLoader title="Loading Users" />);
      
      expect(screen.getByText('Loading Users')).toBeInTheDocument();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now();
      render(<FullScreenLoader />);
      const endTime = performance.now();
      
      // Should render quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles multiple instances efficiently', () => {
      const startTime = performance.now();
      
      render(
        <div>
          <FullScreenLoader title="Loader 1" />
          <FullScreenLoader title="Loader 2" />
          <FullScreenLoader title="Loader 3" />
        </div>
      );
      
      const endTime = performance.now();
      
      // Should handle multiple instances efficiently
      expect(endTime - startTime).toBeLessThan(200);
      expect(screen.getByText('Loader 1')).toBeInTheDocument();
      expect(screen.getByText('Loader 2')).toBeInTheDocument();
      expect(screen.getByText('Loader 3')).toBeInTheDocument();
    });
  });
});
