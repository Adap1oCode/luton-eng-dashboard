// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { APP_CONFIG } from "@/config/app-config";
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name ?? "IMS Admin",
    // Pages can set `metadata.title = "Tally Cards"` and it renders as:
    // "Tally Cards – IMS Admin"
    template: `%s – ${APP_CONFIG.meta?.title || "IMS Admin"}`,
  },
  description: APP_CONFIG.meta?.description ?? "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
