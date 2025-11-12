import type { Metadata } from "next";
import { Suspense } from "react";

import { ThemeProvider } from "next-themes";
import { Analytics } from '@vercel/analytics/react';
import { Inter } from "next/font/google";

import "./globals.css";
import { AppLoaderProvider } from "@/components/providers/app-loader-provider";
import AppLoaderOverlay from "@/components/common/app-loader-overlay";
import RouteLoaderBridge from "@/components/common/route-loader-bridge";
import { WebVitalsClient } from "@/components/analytics/web-vitals-client";
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
        <WebVitalsClient />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppLoaderProvider>
            <Suspense fallback={null}>
              <RouteLoaderBridge />
            </Suspense>
            <ErrorBoundary>{children}</ErrorBoundary>
            <AppLoaderOverlay />
          </AppLoaderProvider>
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
