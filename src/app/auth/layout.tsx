import React, { ReactNode } from "react";

// Minimal layout for auth pages - no sidebar, header, or main app UI
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
