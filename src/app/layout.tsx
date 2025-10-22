import type { Metadata } from "next";

import { ThemeProvider } from "next-themes";

import "./globals.css";
import { APP_CONFIG } from "@/config/app-config";

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name || "IMS Admin",
    template: `%s – ${APP_CONFIG.meta.title || "IMS Admin"}`,
  },
  description: APP_CONFIG.meta.description || "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
