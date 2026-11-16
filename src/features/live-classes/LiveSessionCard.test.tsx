import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { LiveSession } from "@/types/models";
import LiveSessionCard from "./LiveSessionCard";
vi.mock("@/hooks/useLanguage", () => ({ useLanguage: () => ({ lang: "en" }) }));
const session = { id: "session", title: "CSS Fundamentals", scheduled_at: "2026-10-30T12:00:00Z", duration_minutes: 60 } as LiveSession;
it("shows the scheduled time and opens session details without claiming it is live", () => {
  const open = vi.fn();
  render(<LiveSessionCard session={{ ...session, status: "scheduled" }} onOpen={open} />);
  expect(screen.getByText("Scheduled")).toBeVisible();
  expect(screen.queryByText("Live now")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View Session" }));
  expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: "session" }));
});
it("offers joining only for a live session", () => {
  render(<LiveSessionCard session={{ ...session, status: "live" }} onOpen={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Join Live Class" })).toBeVisible();
  expect(screen.getByText("Live now")).toBeVisible();
});
it("describes completed sessions as ended without a join action", () => {
  render(<LiveSessionCard session={{ ...session, status: "completed" }} onOpen={vi.fn()} />);
  expect(screen.getByText("Ended")).toBeVisible();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
