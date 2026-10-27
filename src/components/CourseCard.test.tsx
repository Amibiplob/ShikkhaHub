import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CourseCard from "./CourseCard";

vi.mock("@/components/BookmarkButton", () => ({ default: () => null }));

describe("CourseCard", () => {
  it("shows course data and links to the course", () => {
    render(<MemoryRouter><CourseCard id="c1" title="React Basics" category="Web" difficulty="beginner" teacher_name="Rahim" thumbnail_url="/x.png" /></MemoryRouter>);
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/courses/c1");
    expect(screen.getByAltText("React Basics")).toBeInTheDocument();
  });

  it("shows local course artwork when there is no thumbnail", () => {
    render(<MemoryRouter><CourseCard id="c2" title="No Pic" /></MemoryRouter>);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/artwork/course-code.svg");
    expect(screen.getByText("No Pic")).toBeInTheDocument();
  });
  it("recovers broken thumbnails without looping on a missing fallback", () => {
    render(<MemoryRouter><CourseCard id="c3" title="Data course" category="Data Science" thumbnail_url="/broken.png" /></MemoryRouter>);
    const image = screen.getByRole("img");
    fireEvent.error(image);
    expect(image).toHaveAttribute("src", "/artwork/course-data.svg");
    fireEvent.error(image);
    expect(image).toHaveAttribute("src", "/artwork/course-data.svg");
  });
});
