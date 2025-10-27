"use client";
import React, { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Github, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Remove Checkbox import if not used
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase";
import { PasswordStrength } from "@/components/auth/password-strength";
import { trackRegisterAttempt, trackRegisterSuccess, trackRegisterFailed, trackAuthError } from "@/lib/analytics";
import { measureApiResponse, trackAuthPerformance, measurePageLoad } from "@/lib/performance";

const FormSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(6, { message: "Confirm Password must be at least 6 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function RegisterFormV1() {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // mirror login's ?next behavior
  function getNextFromLocation(): string {
    try {
      const sp = new URLSearchParams(window.location.search);
      const n = sp.get("next");
      return n && n.startsWith("/") ? n : "/dashboard";
    } catch {
      return "/dashboard";
    }
  }

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    start(async () => {
      if (pending) return;
      const email = values.email.toLowerCase().trim();
      const password = values.password.trim();
      const next = getNextFromLocation();

      // Track registration attempt
      trackRegisterAttempt();

      try {
        const { result, responseTime } = await measureApiResponse(async () => {
          const s = supabaseBrowser();
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

          return await s.auth.signUp({
            email,
            password,
            options: { emailRedirectTo },
          });
        });

        if (result.error) {
          trackRegisterFailed(result.error.message);
          toast.error("Registration failed", { description: result.error.message });
          return;
        }

        // Track performance metrics
        trackAuthPerformance({
          pageLoadTime: measurePageLoad(),
          authFormRenderTime: 0,
          apiResponseTime: responseTime,
          totalAuthTime: responseTime,
        });

        if (!result.data.session) {
          // Email confirmation required
          trackRegisterSuccess(); // Still count as success since account was created
          toast.success("Check your email", {
            description: "We sent a confirmation link to finish setting up your account.",
          });
          return;
        }

        // Auto-confirmed (session created)
        trackRegisterSuccess();
        toast.success("Account created", { description: "Welcome!" });
        window.location.href = next;
      } catch (e: any) {
        trackAuthError(e, 'registration');
        trackRegisterFailed(e?.message ?? 'unknown_error');
        toast.error("Registration failed", {
          description: e?.message ?? "Please try again.",
        });
      }
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">Create an account</h1>
        </div>

        {/* Social Login Buttons */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-full border-gray-300 text-gray-700 transition-all duration-200 hover:bg-gray-50"
            disabled={pending}
          >
            <Github className="mr-3 h-5 w-5" />
            GitHub
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-full border-gray-300 text-gray-700 transition-all duration-200 hover:bg-gray-50"
            disabled={pending}
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm uppercase">
            <span className="bg-white px-4 font-medium tracking-wider text-gray-500">OR CONTINUE WITH</span>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email" className="text-base font-medium text-gray-700">Email</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      className="h-12 rounded-lg border-gray-300 text-base focus:border-orange-500 focus:ring-orange-500"
                      disabled={pending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password" className="text-base font-medium text-gray-700">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-12 rounded-lg border-gray-300 pr-12 text-base focus:border-orange-500 focus:ring-orange-500"
                        disabled={pending}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={pending}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <PasswordStrength password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="confirmPassword" className="text-base font-medium text-gray-700">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
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
                        onClick={() => setShowPassword(!showPassword)}
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
            <Button
              className="mt-8 h-12 w-full rounded-lg bg-orange-500 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-orange-600 hover:shadow-lg"
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Please wait..." : "Create account"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
