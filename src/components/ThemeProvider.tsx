import { useLayoutEffect, type ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  useLayoutEffect(() => {
    // Prevent foreground/background transitions from producing a low-contrast frame.
    const transitions = document.createElement("style");
    transitions.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(transitions);
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    // Flush the new palette before restoring ordinary component transitions.
    window.getComputedStyle(document.body).getPropertyValue("opacity");
    const timer = window.setTimeout(() => transitions.remove(), 1);
    return () => { window.clearTimeout(timer); transitions.remove(); };
  }, [resolvedTheme]);
  return children;
}
