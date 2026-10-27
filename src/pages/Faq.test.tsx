import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Faq from "./Faq";
import { vi } from "vitest";
vi.mock("@/components/layout/Header", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));
describe("FAQ", () => {
  it("searches actual answers and opens accessible accordion content", async () => {
    render(
      <MemoryRouter>
        <Faq />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Search questions"), {
      target: { value: "refund" },
    });
    const question = screen.getByRole("button", {
      name: "Are paid courses and refunds supported?",
    });
    // Radix Presence schedules animation/presence work after the click.
    await act(async () => { fireEvent.click(question); });
    expect(
      screen.getByText(/payments and paid enrollment are not available/),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "How do I create an account?" }),
    ).not.toBeInTheDocument();
  });
  it("has an empty state and contact route", () => {
    render(
      <MemoryRouter>
        <Faq />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Search questions"), {
      target: { value: "not-a-real-question" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("No matching");
    expect(
      screen.getByRole("link", { name: "Contact Support" }),
    ).toHaveAttribute("href", "/contact");
  });
});
