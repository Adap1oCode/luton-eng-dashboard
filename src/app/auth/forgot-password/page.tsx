import React from "react";
import { Metadata } from "next";

import { Command } from "lucide-react";

import { ForgotPasswordForm } from "./_components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password to regain access to your account.",
  robots: "noindex, nofollow", // Prevent indexing of auth pages
  openGraph: {
    title: "Forgot Password",
    description: "Reset your password",
    type: "website",
  },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Welcome Section */}
      <div className="hidden bg-gradient-to-br from-primary to-primary/90 lg:flex lg:w-1/3">
        <div className="flex w-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-8">
            {/* Logo/Icon */}
            <div className="relative flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Command className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="space-y-4">
              <h1 className="text-6xl font-light tracking-tight text-white">Reset password</h1>
              <p className="max-w-md text-xl leading-relaxed font-light text-white/90">
                We&apos;ll help you get back into your account.
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="mt-12 flex justify-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-white/40"></div>
              <div className="h-2 w-2 rounded-full bg-white/60"></div>
              <div className="h-2 w-2 rounded-full bg-white/80"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full items-center justify-center bg-muted p-8 lg:w-2/3">
        <div className="w-full max-w-lg">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}


