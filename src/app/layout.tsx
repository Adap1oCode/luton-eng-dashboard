import type { Metadata } from "next";

import { ThemeProvider } from "next-themes";
import { Analytics } from '@vercel/analytics/react';
import { Inter } from "next/font/google";

import "./globals.css";
import InitialLoadGate from "@/components/common/initial-load-gate";
import RouteTransitionOverlay from "@/components/common/route-transition-overlay";
import { APP_CONFIG } from "@/config/app-config";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], weight: "400", display: "swap" });

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
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <RouteTransitionOverlay />
          <ErrorBoundary>
            <InitialLoadGate>{children}</InitialLoadGate>
          </ErrorBoundary>
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
