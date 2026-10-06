// Shared fake auth state for tests. Use with:
// vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockAuth.value }));
export type FakeRole = "admin" | "teacher" | "student";

export const makeAuth = (roles: FakeRole[] = [], signedIn = true, loading = false) => ({
  user: signedIn ? { id: "u1", email: "test@example.com" } : null,
  roles,
  loading,
  hasRole: (r: FakeRole) => roles.includes(r),
});

export const mockAuth: { value: ReturnType<typeof makeAuth> } = { value: makeAuth() };
