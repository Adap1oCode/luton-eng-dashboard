"use client";

import React, { useEffect, useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  trackLoginAttempt,
  trackLoginSuccess,
  trackLoginFailed,
  trackMagicLinkSent,
  trackAuthError,
} from "@/lib/analytics";
import { measureApiResponse, trackAuthPerformance, measurePageLoad } from "@/lib/performance";
import { supabaseBrowser } from "@/lib/supabase";

import { sendMagicLink } from "../../actions"; // server action

// -----------------------------
// Schema
// -----------------------------
const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  // Optional password: allow empty string "" to trigger the magic-link flow
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional().or(z.literal("")),
  remember: z.boolean().optional(),
});

// -----------------------------
// Helpers
// -----------------------------
function getNextFromLocation(): string {
  try {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("next");
    // Guard against external redirects
    return n && n.startsWith("/") ? n : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Please try again.";
}

/**
 * Verify session is ready and get default homepage if needed.
 * Polls /api/me/role with retries to ensure cookies are propagated to server.
 * 
 * @param supabase - Supabase client instance
 * @param next - The next path to redirect to (or "/dashboard" if default)
 * @returns The redirect path (either next or defaultHomepage from API)
 */
async function verifySessionAndGetRedirectPath(
  supabase: ReturnType<typeof supabaseBrowser>,
  next: string
): Promise<string> {
  // First, verify session exists client-side
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("Session not available after login");
  }

  // Always verify session is accessible server-side by polling /api/me/role
  // This ensures cookies are propagated before we redirect
  const maxRetries = 5;
  const retryDelay = 200; // ms
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("/api/me/role", {
        cache: "no-store",
        credentials: "include", // Ensure cookies are sent
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // If we need the default homepage, use it; otherwise use the provided next path
        if (next === "/dashboard" && data.defaultHomepage) {
          return data.defaultHomepage;
        }
        
        // Session is verified, return the next path
        return next;
      }
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        // On final failure, if we were trying to get default homepage, fallback to /dashboard
        // Otherwise, still return next (session might be ready but API call failed)
        if (next === "/dashboard") {
          console.warn("Failed to fetch default homepage after login, using /dashboard fallback:", error);
          return "/dashboard";
        }
        // For non-dashboard paths, assume session is ready (cookies might be propagated)
        // The server-side protectRoute will handle authentication
        return next;
      }
    }
  }
  
  // If all retries failed, return next path (server-side will handle auth check)
  // If next was /dashboard, we already handled that in the catch block
  return next;
}

// -----------------------------
// Component
// -----------------------------
export function LoginFormV1() {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();
  const [forgotPasswordHref, setForgotPasswordHref] = useState("/auth/forgot-password");
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: "", password: "", remember: false },
    mode: "onSubmit",
  });

  // Show success message if redirected from password reset
  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      toast.success("Password reset successful", {
        description: "Please log in with your new password.",
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Set forgot password href on client side only to avoid hydration mismatch
  useEffect(() => {
    const next = getNextFromLocation();
    if (next !== "/dashboard") {
      setForgotPasswordHref(`/auth/forgot-password?next=${encodeURIComponent(next)}`);
    } else {
      setForgotPasswordHref("/auth/forgot-password");
    }
  }, []);

  const togglePasswordVisibility = () => setShowPassword((s) => !s);

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    start(async () => {
      if (pending) return;
      const email = values.email.toLowerCase().trim();
      const password = (values.password ?? "").trim();
      const next = getNextFromLocation();

      // Track login attempt
      const method = password.length >= 6 ? "password" : "magic_link";
      trackLoginAttempt(method);

      // With password → regular sign-in
      if (password.length >= 6) {
        try {
          const s = supabaseBrowser();
          const { result, responseTime } = await measureApiResponse(async () => {
            return await s.auth.signInWithPassword({ email, password });
          });

          if (result.error) {
            trackLoginFailed("password", result.error.message);
            toast.error("Login failed", { description: result.error.message });
            return;
          }

          // Track successful login
          trackLoginSuccess("password");

          // Optional "remember me" UI hint only (no security impact)
          try {
            if (values.remember) localStorage.setItem("remember_login", "1");
            else localStorage.removeItem("remember_login");
          } catch (e) {
            // best-effort; ignore storage errors
            console.warn("localStorage unavailable:", e);
          }

          // Track performance metrics
          trackAuthPerformance({
            pageLoadTime: measurePageLoad(),
            authFormRenderTime: 0, // Would need to be measured at component mount
            apiResponseTime: responseTime,
            totalAuthTime: responseTime,
          });

          toast.success("Logged in", { description: "Welcome back!" });
          
          // Verify session is ready and get redirect path (with retries for cookie propagation)
          try {
            const redirectPath = await verifySessionAndGetRedirectPath(s, next);
            window.location.href = redirectPath;
          } catch (error) {
            // If session verification fails, still try to redirect (user might be logged in)
            console.error("Session verification failed, attempting redirect anyway:", error);
            window.location.href = next;
          }
          return;
        } catch (error) {
          trackAuthError(error as Error, "password_login");
          trackLoginFailed("password", "network_error");
          toast.error("Login failed", { description: "Network error. Please try again." });
          return;
        }
      }

      // Without password → magic link
      try {
        const { responseTime } = await measureApiResponse(async () => {
          await sendMagicLink(email, window.location.origin, next);
        });

        trackMagicLinkSent(email);

        // Track performance metrics
        trackAuthPerformance({
          pageLoadTime: measurePageLoad(),
          authFormRenderTime: 0,
          apiResponseTime: responseTime,
          totalAuthTime: responseTime,
        });

        toast.success("Magic link sent", {
          description: "Check your inbox to complete sign-in.",
        });
      } catch (err: unknown) {
        trackAuthError(err as Error, "magic_link");
        trackLoginFailed("magic_link", getErrorMessage(err));
        toast.error("Could not send magic link", {
          description: getErrorMessage(err),
        });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground">Login</h1>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email" className="text-base font-medium">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className="h-12 rounded-lg text-base"
                      disabled={pending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password (optional) */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel htmlFor="password" className="text-base font-medium">Password</FormLabel>
                    <span className="text-xs text-muted-foreground">Leave empty for a magic link</span>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-12 rounded-lg pr-12 text-base"
                        disabled={pending}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={togglePasswordVisibility}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={pending}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                href={forgotPasswordHref}
                onClick={() => {
                  const clickTime = performance.now();
                  // Send to API endpoint for server-side logging
                  fetch('/api/logs/user-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'forgot_password_click',
                      route: '/auth/forgot-password',
                      click_time: clickTime,
                    }),
                  }).catch(() => {
                    // Silently fail - logging shouldn't break the app
                  });

                  // Also track when the page becomes ready
                  if (typeof window !== 'undefined') {
                    window.addEventListener(
                      'load',
                      () => {
                        const loadTime = performance.now();
                        const duration = loadTime - clickTime;
                        fetch('/api/logs/user-action', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'forgot_password_loaded',
                            duration_ms: Math.round(duration),
                          }),
                        }).catch(() => {
                          // Silently fail
                        });
                      },
                      { once: true }
                    );
                  }
                }}
                className="text-sm font-medium text-primary underline-offset-2 transition-colors duration-200 hover:text-primary/90 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Remember me */}
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox
                      id="login-remember"
                      checked={!!field.value}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                      className="mt-1"
                      aria-describedby="remember-desc"
                      disabled={pending}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="login-remember" className="cursor-pointer text-base font-medium">
                      Remember me for 7 days
                    </FormLabel>
                    <p id="remember-desc" className="text-xs text-muted-foreground">
                      Don&apos;t use on a shared device.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              variant="default"
              size="lg"
              className="mt-8 h-12 w-full rounded-lg text-base font-semibold"
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Please wait..." : "Login"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
