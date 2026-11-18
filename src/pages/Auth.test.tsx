import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "./Auth";

const fake = vi.hoisted(() => ({ status: 'unavailable', oauth: vi.fn(), recovery: vi.fn() }));
vi.mock("@/features/auth/useGoogleProvider", () => ({ useGoogleProvider: () => fake.status }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: null, roles: [], loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ legacyRecovery: false, supabase: { auth: { signInWithOAuth: fake.oauth, resetPasswordForEmail: fake.recovery }, from: () => ({}) } }));
vi.mock("@/components/layout/Header", () => ({ default: () => null }));

const at = (url: string) => render(<MemoryRouter initialEntries={[url]}><Auth /></MemoryRouter>);

beforeEach(() => { fake.status = 'unavailable'; fake.oauth.mockReset(); fake.recovery.mockReset(); });
describe("Auth page", () => {
  it("disables Google while the provider is unavailable", () => {
    at('/auth');
    expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled();
    expect(fake.oauth).not.toHaveBeenCalled();
  });
  it("starts Google with an exact local callback and no role metadata", async () => {
    fake.status = 'enabled'; fake.oauth.mockResolvedValue({ error: null });
    at('/auth'); fireEvent.click(screen.getByRole('button', { name: 'Google' }));
    await waitFor(() => expect(fake.oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } }));
  });
  it("recovers from an OAuth start failure", async () => {
    fake.status = 'enabled'; fake.oauth.mockRejectedValue(new Error('offline'));
    at('/auth'); fireEvent.click(screen.getByRole('button', { name: 'Google' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Google' })).toBeEnabled());
  });
  it("keeps recovery on the exact reset route", async () => {
    fake.recovery.mockResolvedValue({ error: null }); at('/auth');
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    await waitFor(() => expect(fake.recovery).toHaveBeenCalledWith('learner@example.test', { redirectTo: `${window.location.origin}/reset-password` }));
  });
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
