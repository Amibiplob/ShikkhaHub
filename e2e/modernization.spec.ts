import { test, expect, login, C, D, Q, users } from "./fixture";

for (const width of [375, 1440]) {
  test(`local artwork and both themes render without overflow at ${width}px`, async ({ page, backend }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const hero = page.getByRole("img", { name: /illustrated coding workspace/ });
    await expect(hero).toBeVisible();
    expect(await hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 800)).toBe(true);
    for (const theme of ["dark", "light"]) {
      if (theme === "light") {
        if (width < 1280) await page.getByRole("button", { name: "Open menu" }).click();
        await page.getByRole("button", { name: "Switch to light mode" }).click();
        if (width < 1280) await page.getByRole("button", { name: "Close menu" }).click();
      }
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      await page.screenshot({ path: info.outputPath(`home-${theme}-${width}.png`), animations: "disabled" });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await page.goto("/courses");
    const thumbnail = page.getByRole("img", { name: "Browser Test Course" });
    await expect(thumbnail).toHaveAttribute("src", "/artwork/course-code.svg");
    await expect.poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect((await page.request.get("/favicon.svg")).ok()).toBe(true);
    expect((await page.request.get("/social-card.png")).ok()).toBe(true);
  });

  test(`assistant streams with the user JWT and fits the viewport at ${width}px`, async ({ page, backend }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await login(page, backend, "student");
    let authorization = "", payload: Record<string, unknown> = {};
    await page.route("**/functions/v1/course-assistant", async route => {
      const req = route.request();
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      };
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      authorization = req.headers().authorization || "";
      payload = req.postDataJSON();
      return route.fulfill({ headers: { ...headers, "Content-Type": "text/event-stream" }, body: 'data: {"choices":[{"delta":{"content":"A loop repeats a sequence of steps."}}]}\n\ndata: [DONE]\n\n' });
    });
    await page.goto(`/courses/${C}`);
    await page.getByRole("button", { name: "Enroll Now" }).click();
    await page.getByRole("button", { name: "Open AI Assistant" }).click();
    await page.getByRole("textbox", { name: "Ask a question" }).fill("Explain loops");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("A loop repeats a sequence of steps.", { exact: true })).toBeVisible();
    expect(payload).toEqual({ courseId: C, messages: [{ role: "user", content: "Explain loops" }] });
    const claims = JSON.parse(Buffer.from(authorization.replace("Bearer ", "").split(".")[1], "base64url").toString());
    expect(claims.sub).toBe(users.student.id);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`assistant-${width}.png`) });
    await page.getByRole("button", { name: "Close AI Assistant" }).click();
    await expect(page.getByRole("button", { name: "Open AI Assistant" })).toBeVisible();
  });
}


test("teacher quiz pass-rate chart attributes attempts to their actual course", async ({ page, backend }) => {
  const secondQuiz = "40000000-0000-4000-8000-000000000002";
  backend.rows.courses.find(course => course.id === D)!.teacher_id = users.teacher.id;
  backend.rows.quizzes.push({ id: secondQuiz, course_id: D, title: "Second course quiz", pass_percentage: 70 });
  backend.rows.quiz_attempts = [
    { id: "attempt-a", quiz_id: Q, user_id: users.student.id, score: 1, total_points: 1, passed: true, completed_at: new Date().toISOString() },
    { id: "attempt-b1", quiz_id: secondQuiz, user_id: users.student.id, score: 1, total_points: 1, passed: true, completed_at: new Date().toISOString() },
    { id: "attempt-b2", quiz_id: secondQuiz, user_id: users.student.id, score: 0, total_points: 1, passed: false, completed_at: new Date().toISOString() },
  ];
  await login(page, backend, "teacher");
  await page.goto("/analytics");
  await page.getByRole("tab", { name: "Engagement", exact: true }).click();
  const chart = page.getByRole("heading", { name: "Quiz Pass Rate by Course" }).locator("..");
  const bars = chart.locator(".recharts-bar-rectangle");
  await expect(bars).toHaveCount(2);
  await bars.nth(0).hover();
  await expect(chart.locator(".recharts-tooltip-item-value")).toHaveText("100");
  await bars.nth(1).hover();
  await expect(chart.locator(".recharts-tooltip-item-value")).toHaveText("50");
});
