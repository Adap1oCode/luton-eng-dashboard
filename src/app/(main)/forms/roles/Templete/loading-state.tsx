import React from "react";

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-center py-8">
            <div className="text-lg text-gray-500">Loading roles...</div>
          </div>
        </div>
      </div>
    </div>
  );
};
