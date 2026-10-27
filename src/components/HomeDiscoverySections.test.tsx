import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ user: { id: "a" } as { id: string } | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: fake.user }) }));
vi.mock("@/hooks/useLanguage", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      let actor = "";
      const query = {
        select: () => query,
        eq: (column: string, value: string | boolean) => { if (column === "user_id") actor = String(value); return query; },
        limit: () => query,
        in: () => query,
        then: (resolve: (value: unknown) => unknown) => {
          if (actor === "b") return new Promise(() => {});
          const data = table === "enrollments"
            ? [{ course_id: "private-a", courses: { id: "private-a", title: "Private A learning progress", category: "Programming", difficulty: "beginner" } }]
            : table === "modules" ? [{ course_id: "private-a", lessons: [{ id: "lesson-a" }] }]
            : [{ lesson_id: "lesson-a" }];
          return Promise.resolve({ data }).then(resolve);
        },
      };
      return query;
    },
  },
}));
import HomeDiscoverySections from "./HomeDiscoverySections";
const { ContinueLearningSection } = HomeDiscoverySections;
it("clears the previous account's learning progress before a different account's request completes", async () => {
  fake.user = { id: "a" };
  const view = render(<MemoryRouter><ContinueLearningSection /></MemoryRouter>);
  await screen.findByText("Private A learning progress");
  fake.user = null;
  view.rerender(<MemoryRouter><ContinueLearningSection /></MemoryRouter>);
  expect(screen.queryByText("Private A learning progress")).toBeNull();
  fake.user = { id: "b" };
  view.rerender(<MemoryRouter><ContinueLearningSection /></MemoryRouter>);
  expect(screen.queryByText("Private A learning progress")).toBeNull();
});
