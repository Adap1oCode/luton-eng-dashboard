"use client";

import React from "react";
import { toast } from "sonner";

interface StockAdjustmentsErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface StockAdjustmentsErrorBoundaryProps {
  children: React.ReactNode;
}

export class StockAdjustmentsErrorBoundary extends React.Component<
  StockAdjustmentsErrorBoundaryProps,
  StockAdjustmentsErrorBoundaryState
> {
  constructor(props: StockAdjustmentsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): StockAdjustmentsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Stock Adjustments Error Boundary]', error, errorInfo);
    
    // Show toast notification for the error
    toast.error('Stock Adjustments Error', {
      description: 'An unexpected error occurred in the stock adjustments page. Please try refreshing.',
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload(),
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-red-500 text-lg font-semibold">
            Something went wrong
          </div>
          <div className="text-gray-600 text-sm text-center max-w-md">
            An unexpected error occurred in the stock adjustments page. Please try refreshing the page.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
