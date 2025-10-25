import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabaseBrowser: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  }),
}));

// Mock server actions
vi.mock("../actions", () => ({
  sendMagicLink: vi.fn(),
}));

import LoginPage from "../login/page";
import RegisterPage from "../register/page";

describe("Auth Routing", () => {
  describe("Login Page", () => {
    it("renders login form without main app layout", () => {
      render(<LoginPage />);

      // Should have login-specific elements
      expect(screen.getByText("Hello again")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      
      // Should have register link
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/auth/register");
    });

    it("has proper form structure", () => {
      render(<LoginPage />);

      // Form elements should be present - check by actual structure
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /remember me/i })).toBeInTheDocument();
    });
  });

  describe("Register Page", () => {
    it("renders register form without main app layout", () => {
      render(<RegisterPage />);

      // Should have register-specific elements
      expect(screen.getByText("Welcome!")).toBeInTheDocument();
      expect(screen.getByText("Create an account")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
      
      // Should have login link
      expect(screen.getByText("Already have an account?")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/auth/login");
    });

    it("has proper form structure", () => {
      render(<RegisterPage />);

      // Form elements should be present - check by actual structure
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });
  });

  describe("Cross-linking", () => {
    it("login page links to register page", () => {
      render(<LoginPage />);
      const registerLink = screen.getByRole("link", { name: "Register" });
      expect(registerLink).toHaveAttribute("href", "/auth/register");
    });

    it("register page links to login page", () => {
      render(<RegisterPage />);
      const loginLink = screen.getByRole("link", { name: "Login" });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });
  });
});
