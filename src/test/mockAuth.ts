// Shared fake auth state for tests. Use with:
// vi.mock("@/features/auth/useAuth", () => ({ useAuth: () => mockAuth.value }));
import type { AppRole } from "@/features/auth/auth-context";
export type FakeRole = AppRole;

export const makeAuth = (roles: FakeRole[] = [], signedIn = true, loading = false) => ({
  user: signedIn ? { id: "u1", email: "test@example.com" } : null,
  roles,
  loading,
  hasRole: (r: FakeRole) => roles.includes(r),
});

export const mockAuth: { value: ReturnType<typeof makeAuth> } = { value: makeAuth() };
