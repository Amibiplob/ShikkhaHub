import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { mockAuth, makeAuth } from "@/test/mockAuth";
import ProtectedRoute from "./ProtectedRoute";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth.value }));

const AuthPage = () => {
  const loc = useLocation();
  return <div>auth page from {(loc.state as { from?: string })?.from}</div>;
};

const renderAt = (path: string, roles?: ("admin" | "teacher" | "student")[]) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={roles}><div>secret</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProtectedRoute", () => {
  it("redirects signed-out visitors to sign-in and remembers where they were", () => {
    mockAuth.value = makeAuth([], false);
    renderAt("/admin?tab=users#x");
    expect(screen.getByText("auth page from /admin?tab=users#x")).toBeInTheDocument();
  });

  it("shows access denied for the wrong role", () => {
    mockAuth.value = makeAuth(["student"]);
    renderAt("/admin", ["admin"]);
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("lets permitted roles through", () => {
    mockAuth.value = makeAuth(["teacher"]);
    renderAt("/admin", ["admin", "teacher"]);
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("allows any signed-in user when no role is required", () => {
    mockAuth.value = makeAuth(["student"]);
    renderAt("/admin");
    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});
