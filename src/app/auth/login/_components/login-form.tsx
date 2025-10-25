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

      // With password → regular sign-in
      if (password.length >= 6) {
        const s = supabaseBrowser();
        const { error } = await s.auth.signInWithPassword({ email, password });

        if (error) {
          toast.error("Login failed", { description: error.message });
          return;
        }

        // Optional "remember me" UI hint only (no security impact)
        try {
          if (values.remember) localStorage.setItem("remember_login", "1");
          else localStorage.removeItem("remember_login");
        } catch (e) {
          // best-effort; ignore storage errors
          console.warn("localStorage unavailable:", e);
        }

        toast.success("Logged in", { description: "Welcome back!" });
        window.location.href = next; // redirect to ?next or /dashboard
        return;
      }

      // Without password → magic link
      try {
        await sendMagicLink(email, window.location.origin, next);
        toast.success("Magic link sent", {
          description: "Check your inbox to complete sign-in.",
        });
      } catch (err: unknown) {
        toast.error("Could not send magic link", {
          description: getErrorMessage(err),
        });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">Login</h1>
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
                  <FormLabel className="text-base font-medium text-gray-700">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className="h-12 rounded-lg border-gray-300 text-base focus:border-orange-500 focus:ring-orange-500"
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
                    <FormLabel className="text-base font-medium text-gray-700">Password</FormLabel>
                    <span className="text-xs text-gray-500">Leave empty for a magic link</span>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-12 rounded-lg border-gray-300 pr-12 text-base focus:border-orange-500 focus:ring-orange-500"
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
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
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
                      className="mt-1 border-gray-300 focus:ring-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                      aria-describedby="remember-desc"
                      disabled={pending}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="login-remember" className="cursor-pointer text-base font-medium text-gray-600">
                      Remember me for 30 days
                    </FormLabel>
                    <p id="remember-desc" className="text-xs text-gray-500">
                      Don't use on a shared device.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              className="mt-8 h-12 w-full rounded-lg bg-orange-500 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-orange-600 hover:shadow-lg"
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
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm uppercase">
            <span className="bg-white px-4 font-medium tracking-wider text-gray-500">OR CONTINUE WITH</span>
          </div>
        </div>

        {/* Social Buttons (wire providers later) */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full border-gray-300 text-gray-700 transition-all duration-200 hover:bg-gray-50"
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
            className="h-12 w-full border-gray-300 text-gray-700 transition-all duration-200 hover:bg-gray-50"
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
