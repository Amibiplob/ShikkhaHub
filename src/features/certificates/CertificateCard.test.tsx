import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { en } from "@/lib/translations";
import { makeAuth, mockAuth } from "@/test/mockAuth";
import CertificateCard from "./CertificateCard";
import type { Completion } from "./completion";

const mocks = vi.hoisted(() => ({ load: vi.fn(), rpc: vi.fn(), download: vi.fn() }));
vi.mock("./completion", () => ({ loadCompletion: mocks.load }));
vi.mock("./certificates", () => ({ downloadCertificate: mocks.download }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: () => mockAuth.value }));
vi.mock("@/hooks/useLanguage", () => {
  const t = (key: string) => en[key];
  return { useLanguage: () => ({ t }) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
const certificate = {
  id: "durable-certificate", course_id: "course", user_id: "u1",
  validated_at: "2026-10-28T00:00:00Z", revoked_at: null, verification_token: "stable-token",
} as Completion["certificate"];
const empty = (): Completion => ({ certificate: null, needsName: false, quizzes: [], assignments: [] });
const mount = (completed = 1, total = 2) => render(<MemoryRouter><CertificateCard courseId="course" completedLessons={completed} totalLessons={total} /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.value = makeAuth(["student"]);
  mocks.load.mockResolvedValue(empty());
});
describe("course completion", () => {
  it("shows lesson counts, accessible progress and actionable missing assessments", async () => {
    mocks.load.mockResolvedValue({
      ...empty(), needsName: true,
      quizzes: [{ id: "q", title: "Required quiz" }],
      assignments: [{ id: "a", title: "Project", max_marks: 100, awaitingGrade: true }]
    });
    mount();
    expect(await screen.findByRole("link", { name: "Pass quiz: Required quiz" })).toHaveAttribute("href", "#course-quizzes");
    expect(screen.getByRole("link", { name: "Awaiting teacher grading: Project" })).toHaveAttribute("href", "/assignments/a");
    expect(screen.getByText("1 / 2 lessons completed")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("link", { name: /Add your full name/ })).toHaveAttribute("href", "/profile");
  });
  it("restores persisted completion and certificate identity on reload", async () => {
    mocks.load.mockResolvedValue({ ...empty(), certificate });
    mount(2, 2);
    expect(await screen.findByText("Course completed · Certificate ready")).toBeVisible();
    expect(screen.getByRole("link", { name: "Verify certificate" })).toHaveAttribute("href", "/certificates/verify/stable-token");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps a rejected finish incomplete and refreshes server guidance", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Incomplete course" } });
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "Finish Course" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Finish Course" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Course completion was not verified");
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("issue_course_certificate", { target_course: "course" });
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
  });
  it("requires a validated response and prevents concurrent finish requests", async () => {
    let resolve!: (result: unknown) => void;
    mocks.rpc.mockImplementation(() => new Promise(r => { resolve = r; }));
    mount();
    const finish = screen.getByRole("button", { name: "Finish Course" });
    await waitFor(() => expect(finish).toBeEnabled());
    fireEvent.click(finish);
    fireEvent.click(finish);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ data: { ...certificate, validated_at: null }, error: null }); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Course completion was not verified");
    expect(screen.queryByText("Course completed · Certificate ready")).not.toBeInTheDocument();
  });
  it("restores download only after verified issuance and preserves server ID", async () => {
    mocks.rpc.mockResolvedValue({ data: certificate, error: null });
    mocks.load.mockResolvedValueOnce(empty()).mockResolvedValue({ ...empty(), certificate });
    mount(2, 2);
    await waitFor(() => expect(screen.getByRole("button", { name: "Finish Course" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Finish Course" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith("durable-certificate"));
  });
  it("distinguishes a historical certificate from newly incomplete requirements", async () => {
    mocks.load.mockResolvedValue({ ...empty(), certificate });
    mount();
    expect(await screen.findByText(/A previously issued certificate is available/)).toBeVisible();
    expect(screen.queryByText("Course completed · Certificate ready")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeVisible();
  });
  it("hides downloads and disables reissue of revoked certificates", async () => {
    mocks.load.mockResolvedValue({ ...empty(), certificate: { ...certificate, revoked_at: "2026-10-28" } });
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("revoked");
    expect(screen.getByRole("button", { name: "Finish Course" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
  });
  it("shows load failures and allows requirements to be retried", async () => {
    mocks.load.mockRejectedValueOnce(new Error("Denied")).mockResolvedValue(empty());
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load requirements");
    fireEvent.click(screen.getByRole("button", { name: "Refresh requirements" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Finish Course" })).toBeEnabled();
  });
});
