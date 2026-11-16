import type { AppRole } from "./auth-context";

/** Navigation preferences only; route guards and database policies enforce access. */
export function primaryWorkspace(roles: readonly AppRole[]) {
  return roles.includes("admin") ? "/admin" : "/dashboard";
}
export function signInDestination(from: unknown, roles: readonly AppRole[]) {
  return typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    !from.startsWith("/auth")
    ? from
    : primaryWorkspace(roles);
}
