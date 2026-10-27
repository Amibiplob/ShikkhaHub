import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CourseAssistant from "./CourseAssistant";
import { toast } from "sonner";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession } } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("CourseAssistant authentication", () => {
  it("sends the signed-in JWT, public apikey and bounded conversation to the Edge Function", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "synthetic-user-jwt" } } });
    const fetcher = vi.fn().mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"Loops repeat steps."}}]}\n\ndata: [DONE]\n\n'));
    vi.stubGlobal("fetch", fetcher);
    try {
      render(<CourseAssistant courseId="course-id" courseTitle="Programming" />);
      fireEvent.click(screen.getByRole("button", { name: "Open AI Assistant" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), { target: { value: "Explain loops" } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await waitFor(() => expect(screen.getByText("Loops repeat steps.")).toBeInTheDocument());
      expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer synthetic-user-jwt");
      expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ courseId: "course-id", messages: [{ role: "user", content: "Explain loops" }] });
    } finally { vi.unstubAllGlobals(); }
  });
  it("does not contact the function without a session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    try {
      render(<CourseAssistant courseId="course-id" courseTitle="Programming" />);
      fireEvent.click(screen.getByRole("button", { name: "Open AI Assistant" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), { target: { value: "Explain loops" } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Sign in to use the assistant"));
      expect(fetcher).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
