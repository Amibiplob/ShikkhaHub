import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import CertificateVerification from "./CertificateVerification";

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

describe("public certificate verification", () => {
  it("clears a previous valid result when navigating to a malformed verification link", async () => {
    rpc.mockResolvedValue({
      data: {
        certificate_number: "CERT-LOCAL",
        course_title: "Local course",
        issued_at: "2026-10-27T00:00:00Z",
        status: "valid",
      },
      error: null,
    });
    render(
      <MemoryRouter
        initialEntries={[
          "/certificates/verify/00000000-0000-4000-9000-000000000002",
        ]}
      >
        <Link to="/certificates/verify/bad-token">Check another link</Link>
        <Routes>
          <Route
            path="/certificates/verify/:token"
            element={<CertificateVerification />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Valid certificate")).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Check another link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Certificate not found",
    );
    expect(screen.queryByText("CERT-LOCAL")).not.toBeInTheDocument();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
