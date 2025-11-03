import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// Mock the auth layout component
import AuthLayout from "../layout";

describe("Auth Layout", () => {
  it("renders children without main app UI elements", () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Test Content</div>
      </AuthLayout>
    );

    // Should render the content
    expect(screen.getByTestId("auth-content")).toBeInTheDocument();
    
    // Should NOT have main app UI elements
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("theme-switcher")).not.toBeInTheDocument();
  });

  it("applies minimal styling", () => {
    const { container } = render(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    );

    // Should have minimal layout styling
    const layoutDiv = container.firstChild as HTMLElement;
    expect(layoutDiv).toHaveClass("min-h-screen", "bg-gray-50");
  });
});
