import { beforeEach, expect, it, vi } from "vitest";
import { checkAndAwardBadges } from "./useBadgeChecker";
const fake = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const result = table === "badges"
        ? { data: [{ id: "completion-badge", criteria_type: "courses_completed", criteria_value: 1 }] }
        : table === "user_badges" ? { data: [] }
        : { count: table === "certificates" ? 2 : 0 };
      const query = {
        select: () => query,
        eq: () => query,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
        insert: fake.insert,
      };
      return query;
    },
  },
}));
beforeEach(() => fake.insert.mockReset());
it("uses authoritative certificate counts for the courses-completed criterion", async () => {
  fake.insert.mockResolvedValue({ error: null });
  const badges = await checkAndAwardBadges("test-user");
  expect(fake.insert).toHaveBeenCalledWith([{ user_id: "test-user", badge_id: "completion-badge" }]);
  expect(badges?.map(badge => badge.id)).toEqual(["completion-badge"]);
});
it("does not report a badge when its database guard rejects the award", async () => {
  fake.insert.mockResolvedValue({ error: new Error("criteria rejected") });
  expect(await checkAndAwardBadges("test-user")).toBeUndefined();
});
