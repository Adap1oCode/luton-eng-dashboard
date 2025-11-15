// vitest.setup.ts
import * as dotenv from "dotenv";
import { vi } from "vitest";
import { existsSync } from "node:fs";
import "@testing-library/jest-dom";

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock HTMLElement prototype for Radix UI components
if (typeof global.HTMLElement === 'undefined') {
  global.HTMLElement = class HTMLElement {
    style: any = {};
    classList: any = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
      toggle: vi.fn(),
    };
    setAttribute = vi.fn();
    getAttribute = vi.fn();
    removeAttribute = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn();
    focus = vi.fn();
    blur = vi.fn();
    click = vi.fn();
    appendChild = vi.fn();
    removeChild = vi.fn();
  } as any;
}

// Mock Element prototype
if (typeof global.Element === 'undefined') {
  global.Element = class Element {
    style: any = {};
    classList: any = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
      toggle: vi.fn(),
    };
    setAttribute = vi.fn();
    getAttribute = vi.fn();
    removeAttribute = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn();
    focus = vi.fn();
    blur = vi.fn();
    click = vi.fn();
    appendChild = vi.fn();
    removeChild = vi.fn();
  } as any;
}

// Ensure Element has a proper prototype
if (global.Element && !global.Element.prototype) {
  global.Element.prototype = {} as any;
}

// Mock document methods that might be needed
if (typeof global.document !== 'undefined') {
  global.document.getElementsByTagName = global.document.getElementsByTagName || vi.fn().mockReturnValue([]);
  global.document.createElement = global.document.createElement || vi.fn().mockReturnValue({
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    click: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    style: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
      toggle: vi.fn(),
    },
  });
  global.document.createTextNode = global.document.createTextNode || vi.fn().mockReturnValue({
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  });
}

// Mock navigator.clipboard
Object.assign(global.navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('')
  }
});

// Also mock window.navigator.clipboard
if (typeof global.window !== 'undefined') {
  Object.assign(global.window.navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue('')
    }
  });
}

// Mock window.navigator.clipboard as well
// Object.defineProperty(global.window, 'navigator', {
//   value: {
//     clipboard: {
//       writeText: vi.fn().mockResolvedValue(undefined),
//       readText: vi.fn().mockResolvedValue('')
//     }
//   },
//   writable: true
// });

// Load the first env file that exists
for (const p of [".env.test.local", ".env.local", ".env"]) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// If your app uses NEXT_PUBLIC_* (common in Next.js),
// mirror them to the non-public names your tests expect.
if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
if (!process.env.SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// Ensure auth scoping is disabled in tests unless explicitly enabled
if (!process.env.AUTH_SCOPING_ENABLED) {
  process.env.AUTH_SCOPING_ENABLED = "false";
}

// --- Next.js test shims -------------------------------------------------------
// Avoid "server-only" import errors when unit-testing server modules in Vitest.
// In tests, we don't actually need server-only behavior; stub the module.
try {
  require.resolve("server-only");
  // If present, replace it with a no-op module via Node's module cache.
  // @ts-ignore
  require.cache[require.resolve("server-only")] = {
    id: "server-only",
    filename: "server-only",
    loaded: true,
    exports: {},
  } as any;
} catch {}

// Mock next/headers primitives that our server code reads.
// Keep them minimal and async to mirror Next 15.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-proto": "http", host: "localhost:3000" }),
  cookies: async () => ({ getAll: () => [] }),
}));

// Provide a default session context so server handlers don't fail
vi.mock("@/lib/auth/get-session-context", () => ({
  getSessionContext: async () => ({
    userId: "test-user",
    canSeeAllWarehouses: true,
    allowedWarehouses: [],
  }),
}));

// Optional sanity ping (keep commented by default)
// console.debug("Vitest env:", {
//   SUPABASE_URL: !!process.env.SUPABASE_URL,
//   SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
// });
