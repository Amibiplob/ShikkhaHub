import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeProvider from "@/app/providers/ThemeProvider";
import { useTheme } from "./useTheme";

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return <><p>{theme}:{resolvedTheme}</p><button onClick={() => setTheme("light")}>Light</button></>;
}
beforeEach(() => localStorage.clear());
describe("client theme preferences", () => {
  it("defaults to dark without rendering a script", () => {
    const { container } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText("dark:dark")).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
    expect(container.querySelector("script")).toBeNull();
  });
  it("persists changes and applies the color scheme", () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => screen.getByRole("button", { name: "Light" }).click());
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
  it("accepts a preference changed in another tab", () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => { localStorage.setItem("theme", "light"); window.dispatchEvent(new StorageEvent("storage", { key: "theme" })); });
    expect(screen.getByText("light:light")).toBeInTheDocument();
  });
  it("reacts to system preference changes", () => {
    let dark = false;
    const listeners = new Set<() => void>();
    const original = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ get matches() { return dark; }, addEventListener: (_event: string, listener: () => void) => { listeners.add(listener); }, removeEventListener: (_event: string, listener: () => void) => { listeners.delete(listener); } })) as unknown as typeof window.matchMedia;
    try {
      localStorage.setItem("theme", "system");
      render(<ThemeProvider><Probe /></ThemeProvider>);
      expect(screen.getByText("system:light")).toBeInTheDocument();
      act(() => { dark = true; listeners.forEach(listener => listener()); });
      expect(screen.getByText("system:dark")).toBeInTheDocument();
      expect(document.documentElement).toHaveClass("dark");
    } finally { window.matchMedia = original; }
  });
});
