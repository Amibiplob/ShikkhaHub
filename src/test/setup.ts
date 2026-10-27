import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// Vitest 5 uses Matchers<R, T>; jest-dom 7 still declares the older Assertion<T>.
// Use the documented matcher extension so return/received types remain checked.
declare module "vitest" {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<T, R> {
    toBeInTheDocument: TestingLibraryMatchers<T, R>["toBeInTheDocument"];
  }
}
expect.extend(matchers);

if (typeof window !== "undefined")
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

// Radix UI needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
