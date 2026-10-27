import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "./Auth";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {}, from: () => ({}) } }));
vi.mock("@/components/Header", () => ({ default: () => null }));

const at = (url: string) => render(<MemoryRouter initialEntries={[url]}><Auth /></MemoryRouter>);

describe("Auth page", () => {
  it("opens sign-in by default", () => {
    at("/auth");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Full Name")).toBeNull();
  });

  it("?tab=signup&role=teacher preselects teacher signup", () => {
    at("/auth?tab=signup&role=teacher");
    expect(screen.getByLabelText("Full Name")).toBeRequired();
    expect(screen.getByRole("checkbox", { name: /teacher/i })).toBeChecked();
    expect(screen.getByLabelText("Password")).toHaveAttribute("minLength", "6");
  });
});
