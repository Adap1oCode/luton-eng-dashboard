import React from "react";

export const PageHeader: React.FC<{ title?: string }> = ({ title }) => {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <svg className="h-12 w-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
            {title ?? "View Roles"}
          </h1>
        </div>
      </div>
    </div>
  );
};
