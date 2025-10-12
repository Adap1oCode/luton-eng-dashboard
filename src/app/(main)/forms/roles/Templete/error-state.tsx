import React from "react";

interface ErrorStateProps {
  error: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-2 text-lg text-red-500">Error loading roles</div>
              <div className="text-sm text-gray-500">{error}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
