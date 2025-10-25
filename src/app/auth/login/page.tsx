import React from "react";
import Link from "next/link";

import { Command } from "lucide-react";

import { LoginFormV1 } from "./_components/login-form";

export default function LoginV1() {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Welcome Section */}
      <div className="hidden bg-gradient-to-br from-orange-500 to-orange-600 lg:flex lg:w-1/3">
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
              <h1 className="text-6xl font-light tracking-tight text-white">Hello again</h1>
              <p className="max-w-md text-xl leading-relaxed font-light text-white/90">Login to continue</p>
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
      <div className="flex w-full items-center justify-center bg-gray-50 p-8 lg:w-2/3">
        <div className="w-full max-w-lg">
          <LoginFormV1 />

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-base text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-orange-500 underline-offset-2 transition-colors duration-200 hover:text-orange-600 hover:underline"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
