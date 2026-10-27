import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light" | "system";
const eventName = "shikkhahub-theme-change";
const isTheme = (value: string | null): value is Theme => value === "dark" || value === "light" || value === "system";
let memoryTheme: Theme = "dark";

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem("theme");
    return isTheme(stored) ? stored : "dark";
  } catch { return memoryTheme; }
}
function snapshot() {
  const theme = readTheme();
  const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  return `${theme}:${resolved}`;
}
function subscribe(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const storage = (event: StorageEvent) => { if (event.key === "theme" || event.key === null) listener(); };
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", storage);
  media.addEventListener("change", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", listener);
  };
}
function setTheme(theme: Theme) {
  memoryTheme = theme;
  try { window.localStorage.setItem("theme", theme); } catch { /* Continue with an in-memory preference when storage is blocked. */ }
  window.dispatchEvent(new Event(eventName));
}

/** Browser-only theme state; the existing `theme` storage key is preserved. */
export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "dark:dark");
  const [theme, resolvedTheme] = value.split(":") as [Theme, "dark" | "light"];
  return { theme, resolvedTheme, setTheme };
}
