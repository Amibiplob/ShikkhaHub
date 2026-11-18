import type { AppRole } from "./auth-context";

/** Navigation preferences only; route guards and database policies enforce access. */
export function primaryWorkspace(roles: readonly AppRole[]) {
  return roles.includes("admin") ? "/admin" : "/dashboard";
}
export function safeReturnPath(from: unknown): string | null {
  if (typeof from !== "string" || !from.startsWith("/") || (from.includes("\\") || [...from].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127))) return null;
  try {
    const origin = "https://shikkhahub.invalid";
    const url = new URL(from, origin);
    if (url.origin !== origin || /^\/(auth|reset-password)(\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}
export function signInDestination(from: unknown, roles: readonly AppRole[]) {
  return safeReturnPath(from) ?? primaryWorkspace(roles);
}

const returnKey = "shikkhahub.oauth-return";
export function rememberAuthReturn(from: unknown) {
  // Failure to preserve the route must not prevent authentication.
  try { sessionStorage.setItem(returnKey, JSON.stringify({ path: safeReturnPath(from), at: Date.now() })); } catch { /* unavailable storage */ }
}
export function readAuthReturn() {
  try {
    const value = sessionStorage.getItem(returnKey);
    const entry = value && JSON.parse(value);
    return entry && Number.isFinite(entry.at) && Date.now() - entry.at >= 0 && Date.now() - entry.at < 600_000 ? safeReturnPath(entry.path) : null;
  } catch { return null; }
}

export function clearAuthReturn() {
  try { sessionStorage.removeItem(returnKey); } catch { /* unavailable storage */ }
}
