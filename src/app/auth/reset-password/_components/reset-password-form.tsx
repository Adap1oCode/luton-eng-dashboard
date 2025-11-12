"use client";

import React, { useEffect, useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { supabaseBrowser } from "@/lib/supabase";

// -----------------------------
// Schema
// -----------------------------
const FormSchema = z
  .object({
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(6, { message: "Confirm Password must be at least 6 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// -----------------------------
// Helpers
// -----------------------------
function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Please try again.";
}

function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!hash) return params;
  
  // Remove the # if present
  const hashWithoutHash = hash.startsWith("#") ? hash.slice(1) : hash;
  
  // Parse query string format: access_token=...&type=recovery
  hashWithoutHash.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  });
  
  return params;
}

// -----------------------------
// Component
// -----------------------------
export function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        // User is already logged in, redirect to dashboard
        toast.info("You are already logged in", {
          description: "Redirecting to dashboard...",
        });
        router.push("/dashboard");
        return;
      }
    };

    // Extract token from URL hash
    const checkToken = () => {
      if (typeof window === "undefined") return;
      
      const hash = window.location.hash;
      const params = parseHashParams(hash);
      
      if (params.access_token && params.type === "recovery") {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        setTokenError("Invalid or missing reset token. Please request a new password reset.");
      }
    };

    checkAuth();
    checkToken();
  }, [router]);

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    start(async () => {
      if (pending) return;
      const password = values.password.trim();

      try {
        const supabase = supabaseBrowser();
        
        // Update password - Supabase will use the token from the URL hash automatically
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          // Handle expired or invalid token
          if (error.message.includes("expired") || error.message.includes("invalid")) {
            setTokenValid(false);
            setTokenError("This reset link has expired or is invalid. Please request a new password reset.");
            toast.error("Reset link expired", {
              description: "Please request a new password reset link.",
            });
            return;
          }
          throw error;
        }

        // Sign out any existing sessions to force re-login with new password
        await supabase.auth.signOut();

        toast.success("Password reset successful", {
          description: "Your password has been updated. Please log in with your new password.",
        });

        // Redirect to login with success message
        router.push("/auth/login?reset=success");
      } catch (err: unknown) {
        toast.error("Failed to reset password", {
          description: getErrorMessage(err),
        });
      }
    });
  };

  const togglePasswordVisibility = () => setShowPassword((s) => !s);

  // Show loading state while checking token
  if (tokenValid === null) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold text-foreground">Reset your password</h1>
            <p className="text-muted-foreground">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold text-foreground">Invalid reset link</h1>
            <p className="text-muted-foreground">{tokenError || "This password reset link is invalid or has expired."}</p>
          </div>
          <div className="space-y-4">
            <Link href="/auth/forgot-password">
              <Button variant="default" size="lg" className="h-12 w-full">
                Request new reset link
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost" size="lg" className="h-12 w-full">
                Back to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show form if token is valid
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground">Set new password</h1>
          <p className="text-muted-foreground">Enter your new password below.</p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password" className="text-base font-medium">
                    New Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
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
                  <PasswordStrength password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="confirmPassword" className="text-base font-medium">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
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

            {/* Submit */}
            <Button
              variant="default"
              size="lg"
              className="mt-8 h-12 w-full rounded-lg text-base font-semibold"
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </Form>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-primary underline-offset-2 transition-colors duration-200 hover:text-primary/90 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

