"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

export function LoginFormV1() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    toast.success("Login successful!", {
      description: "Welcome back! You've been logged in successfully.",
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Login</h1>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium text-base">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      autoComplete="email"
                      className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500 rounded-lg"
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
                  <FormLabel className="text-gray-700 font-medium text-base">Password</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500 rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="login-remember"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-1 border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 focus:ring-orange-500"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel 
                      htmlFor="login-remember" 
                      className="text-gray-600 text-base font-medium cursor-pointer"
                    >
                      Remember me for 30 days
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Button 
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base rounded-lg transition-all duration-200 shadow-md hover:shadow-lg mt-8" 
              type="submit"
            >
              Login
            </Button>
          </form>
        </Form>
        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm uppercase">
            <span className="bg-white px-4 text-gray-500 font-medium tracking-wider">OR CONTINUE WITH</span>
          </div>
        </div>

        {/* Google Login Button */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <Github className="w-5 h-5 mr-3" />
            GitHub
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
        </div>
      </div>
    </div>
  );
}