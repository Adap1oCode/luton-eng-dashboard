"use client";

import React, { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";

import { requestPasswordReset } from "../../actions";

// -----------------------------
// Schema
// -----------------------------
const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
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

// -----------------------------
// Component
// -----------------------------
export function ForgotPasswordForm() {
  const [pending, start] = useTransition();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    start(async () => {
      if (pending) return;
      const email = values.email.toLowerCase().trim();

      try {
        await requestPasswordReset(email, window.location.origin);
        setEmailSent(true);
        toast.success("Password reset email sent", {
          description: "Check your inbox for instructions to reset your password.",
        });
      } catch (err: unknown) {
        toast.error("Could not send reset email", {
          description: getErrorMessage(err),
        });
      }
    });
  };

  if (emailSent) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold text-foreground">Check your email</h1>
            <p className="text-muted-foreground">
              We sent a password reset link to <strong>{form.getValues("email")}</strong>
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full"
                onClick={() => {
                  setEmailSent(false);
                  form.reset();
                }}
              >
                Send another email
              </Button>
              <Link href="/auth/login">
                <Button variant="ghost" size="lg" className="h-12 w-full">
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground">Reset your password</h1>
          <p className="text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
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
                  <FormLabel htmlFor="email" className="text-base font-medium">
                    Email Address
                  </FormLabel>
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

            {/* Submit */}
            <Button
              variant="default"
              size="lg"
              className="mt-8 h-12 w-full rounded-lg text-base font-semibold"
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Sending..." : "Send reset link"}
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


