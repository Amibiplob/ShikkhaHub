import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { mockAuth, makeAuth } from "@/test/mockAuth";
import { usePermissions } from "./usePermissions";

vi.mock("@/features/auth/useAuth", () => ({ useAuth: () => mockAuth.value }));

const perms = (auth: ReturnType<typeof makeAuth>) => {
  mockAuth.value = auth;
  return renderHook(() => usePermissions()).result.current;
};

describe("usePermissions (RBAC)", () => {
  it("signed-out visitors can do nothing", () => {
    const p = perms(makeAuth([], false));
    expect(Object.values(p.can).every((v) => v === false)).toBe(true);
  });

  it("students can enroll only", () => {
    const p = perms(makeAuth(["student"]));
    expect(p.can.enroll).toBe(true);
    expect(p.can.createCourse).toBe(false);
    expect(p.can.manageUsers).toBe(false);
  });

  it("teachers can teach but not administer", () => {
    const p = perms(makeAuth(["teacher"]));
    expect(p.can.createCourse && p.can.gradeSubmissions && p.can.viewAnalytics).toBe(true);
    expect(p.can.manageRoles || p.can.editAnyCourse || p.can.moderateCommunity).toBe(false);
  });

  it("admins can do everything", () => {
    const p = perms(makeAuth(["admin"]));
    expect(Object.values(p.can).every(Boolean)).toBe(true);
    expect(p.hasAnyRole(["teacher", "admin"])).toBe(true);
  });
});
