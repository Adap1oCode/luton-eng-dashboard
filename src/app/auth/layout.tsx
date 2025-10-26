import React, { ReactNode } from "react";

// Minimal layout for auth pages - no sidebar, header, or main app UI
// Includes dark mode support
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {children}
    </div>
  );
}
