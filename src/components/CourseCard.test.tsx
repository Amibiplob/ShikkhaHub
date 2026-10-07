import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/BookmarkButton", () => ({ default: () => null }));
import CourseCard from "./CourseCard";

describe("CourseCard", () => {
  it("shows course data and links to the course", () => {
    render(<MemoryRouter><CourseCard id="c1" title="React Basics" category="Web" difficulty="beginner" teacher_name="Rahim" thumbnail_url="/x.png" /></MemoryRouter>);
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/courses/c1");
    expect(screen.getByAltText("React Basics")).toBeInTheDocument();
  });

  it("shows a placeholder when there is no thumbnail", () => {
    render(<MemoryRouter><CourseCard id="c2" title="No Pic" /></MemoryRouter>);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("No Pic")).toBeInTheDocument();
  });
});
