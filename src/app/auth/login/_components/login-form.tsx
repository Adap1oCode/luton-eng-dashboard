"use client";

import React, { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Github, Eye, EyeOff } from "lucide-react";
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

// -----------------------------
// Component
// -----------------------------
export function LoginFormV1() {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: "", password: "", remember: false },
    mode: "onSubmit",
  });

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
          const { result, responseTime } = await measureApiResponse(async () => {
            const s = supabaseBrowser();
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
          window.location.href = next; // redirect to ?next or /dashboard
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
                      Remember me for 30 days
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

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm uppercase">
            <span className="bg-card px-4 font-medium tracking-wider text-muted-foreground">OR CONTINUE WITH</span>
          </div>
        </div>

        {/* Social Buttons (wire providers later) */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full"
            onClick={() => toast.info("GitHub OAuth not configured yet")}
            aria-label="Continue with GitHub"
            disabled={pending}
          >
            <Github className="mr-3 h-5 w-5" />
            GitHub
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full"
            onClick={() => toast.info("Google OAuth not configured yet")}
            aria-label="Continue with Google"
            disabled={pending}
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
        </div>
      </div>
    </div>
  );
}
