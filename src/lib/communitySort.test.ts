import { describe, it, expect } from "vitest";
import { sortPopular, paginate, pageCount } from "./communitySort";

const p = (id: string, day: number, pinned = false) => ({ id, is_pinned: pinned, created_at: `2026-01-${String(day).padStart(2, "0")}T00:00:00Z` });

describe("community sorting & paging", () => {
  it("Popular: pinned first, then votes, then newest", () => {
    const posts = [p("a", 1), p("b", 2), p("c", 3, true), p("d", 4)];
    const out = sortPopular(posts, { a: 5, b: 5, d: 1 }).map((x) => x.id);
    expect(out).toEqual(["c", "b", "a", "d"]);
  });

  it("vote order holds across pages", () => {
    const posts = Array.from({ length: 25 }, (_, i) => p(`p${i}`, (i % 28) + 1));
    const counts = Object.fromEntries(posts.map((x, i) => [x.id, i]));
    const sorted = sortPopular(posts, counts);
    const last1 = paginate(sorted, 0, 10).at(-1)!;
    const first2 = paginate(sorted, 1, 10)[0];
    expect(counts[last1.id]).toBeGreaterThanOrEqual(counts[first2.id]);
    expect(paginate(sorted, 2, 10)).toHaveLength(5);
  });

  it("page count is at least 1", () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(21, 10)).toBe(3);
  });
});
