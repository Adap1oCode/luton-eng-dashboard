import Link from "next/link";
import { Command } from "lucide-react";
import { LoginFormV1 } from "./_components/login-form";

export default function LoginV1() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Welcome Section */}
      <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-orange-500 to-orange-600">
        <div className="flex flex-col items-center justify-center p-12 text-center w-full">
          <div className="space-y-8">
            {/* Logo/Icon */}
            <div className="relative flex justify-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Command className="w-10 h-10 text-white" />
              </div>
            </div>
            
            {/* Welcome Text */}
            <div className="space-y-4">
              <h1 className="text-6xl font-light text-white tracking-tight">
                Hello again
              </h1>
              <p className="text-xl text-white/90 font-light max-w-md leading-relaxed">
                Login to continue
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="flex space-x-2 mt-12 justify-center">
              <div className="w-2 h-2 bg-white/40 rounded-full"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full"></div>
              <div className="w-2 h-2 bg-white/80 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-lg">
          <LoginFormV1 />
          
          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-base">
              Don't have an account?{" "}
              <Link 
                href="/register" 
                className="text-orange-500 font-semibold hover:text-orange-600 transition-colors duration-200 underline-offset-2 hover:underline"
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