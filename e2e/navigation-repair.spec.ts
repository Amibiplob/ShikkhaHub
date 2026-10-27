import { test, expect, login, C, users, type Role } from "./fixture";

for (const width of [320, 375, 425, 768]) {
  for (const role of [null, "student", "teacher", "admin"] as const) {
    test(`mobile navigation ${role || "guest"} at ${width}px`, async ({ page, backend }, info) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: 740 });
      await page.addInitScript(dark => localStorage.setItem("theme", dark ? "dark" : "light"), width === 320 || width === 425);
      if (role) await login(page, backend, role);
      else await page.goto("/");
      const trigger = page.getByRole("button", { name: "Open menu", exact: true });
      await expect(trigger).toBeVisible();
      await trigger.click();
      const menu = page.getByRole("dialog", { name: "Navigation", exact: true });
      await expect(menu).toBeVisible();
      const dark = width === 320 || width === 425;
      await expect(page.locator("html")).toHaveClass(dark ? /dark/ : /light/);
      await menu.getByRole("button", { name: dark ? "Switch to light mode" : "Switch to dark mode", exact: true }).click();
      await expect(page.locator("html")).toHaveClass(dark ? /light/ : /dark/);
      await menu.getByRole("button", { name: dark ? "Switch to dark mode" : "Switch to light mode", exact: true }).click();
      await expect(page.locator('button[aria-label="Open menu"]')).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "1");
      await expect(menu.getByRole("link", { name: "Private Tutoring", exact: true })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Admin", exact: true })).toHaveCount(role === "admin" ? 1 : 0);
      await expect(menu.getByRole("link", { name: "Analytics", exact: true })).toHaveCount(role === "teacher" ? 1 : 0);
      await expect(menu.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(role ? 1 : 0);
      await expect(menu.getByRole("link", { name: "Certificates & Badges", exact: true })).toHaveCount(role ? 1 : 0);
      await expect(menu.getByRole("link", { name: "Teach on ShikkhaHub", exact: true })).toHaveCount(!role || role === "student" ? 1 : 0);
      expect(await menu.evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      })).toBe(true);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      // Shift+Tab from the first focusable control must remain inside the modal.
      await menu.getByRole("button", { name: "Close menu", exact: true }).focus();
      await page.keyboard.press("Shift+Tab");
      expect(await menu.evaluate(el => el.contains(document.activeElement))).toBe(true);
      if (role === "admin" || !role) await menu.screenshot({ path: info.outputPath(`menu-${role || "guest"}-${width}.png`) });
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
      await trigger.click();
      await page.mouse.click(1, 739);
      await expect(menu).toHaveCount(0);
      await trigger.click();
      await menu.getByRole("button", { name: "Close menu", exact: true }).click();
      await expect(menu).toHaveCount(0);
      await trigger.click();
      await menu.getByRole("link", { name: "Courses", exact: true }).click();
      await expect(page).toHaveURL(/\/courses$/);
      await expect(menu).toHaveCount(0);
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.goBack();
      await expect(menu).toHaveCount(0);
      await page.goForward();
      await expect(menu).toHaveCount(0);
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      if (role) {
        await menu.getByRole("button", { name: "Sign out", exact: true }).click();
        await expect(menu).toHaveCount(0);
        await page.getByRole("button", { name: "Open menu", exact: true }).click();
        await expect(menu.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
        await expect(menu.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
      } else {
        await menu.getByRole("link", { name: "Sign in", exact: true }).click();
        await expect(page).toHaveURL(/\/auth$/);
        await page.getByLabel("Email", { exact: true }).fill(users.student.email);
        await page.getByLabel("Password", { exact: true }).fill(backend.password);
        await page.getByRole("button", { name: "Sign In", exact: true }).click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(menu).toHaveCount(0);
      }
    });
  }
}

for (const role of ["student", "teacher", "admin"] as Role[]) {
  test(`direct nested routes and delayed session restoration for ${role}`, async ({ page, backend }) => {
    test.setTimeout(60_000);
    await login(page, backend, role);
    backend.roleDelay = 500;
    const paths = ["/dashboard?tab=learning", "/profile", "/certificates", "/achievements"];
    if (role === "teacher") paths.push("/analytics");
    if (role === "admin") paths.push("/admin");
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(/don't have access to this page/)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "404", exact: true })).toHaveCount(0);
      await page.reload();
      await expect(page.locator("main")).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(path.split("?")[0]);
      await expect(page.getByText(/don't have access to this page/)).toHaveCount(0);
    }
  });
}

test("public nested refresh, recovery entry and genuine unknown route", async ({ page, backend }) => {
  for (const path of [`/courses/${C}`, "/certificates/verify/10000000-0000-4000-8000-000000000099", "/reset-password", "/auth?tab=signup&role=teacher"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "404", exact: true })).toHaveCount(0);
  }
  await page.goto("/truly-unknown-route");
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
});

test("mobile menu closes on desktop resize and works in Bangla", async ({ page, backend }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(menu).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(menu).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  await page.setViewportSize({ width: 375, height: 740 });
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await menu.getByRole("button", { name: "Switch language", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "নেভিগেশন" })).toBeVisible();
  await page.getByRole("button", { name: "মেনু বন্ধ করুন", exact: true }).click();
  await expect(page.getByRole("button", { name: "মেনু খুলুন", exact: true })).toBeVisible();
});

test("empty successful progress writes cannot show false completion", async ({ page, backend }) => {
  backend.rows.enrollments.push({ id: "enrolled", user_id: users.student.id, course_id: C });
  await login(page, backend, "student");
  await page.goto(`/courses/${C}`);
  await page.route("**/rest/v1/lesson_progress?**", route => {
    if (route.request().method() === "POST") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    return route.fallback();
  });
  await page.getByRole("button", { name: "Mark Lesson Complete", exact: true }).click();
  await expect(page.getByText("Progress was not saved. Try again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark Lesson Complete", exact: true })).toBeEnabled();
  await expect(page.getByText("0 / 1 lessons completed", { exact: true })).toBeVisible();
  expect(backend.rows.lesson_progress).toHaveLength(0);
});

test("unenrolled users cannot finish another student's course", async ({ page, backend }) => {
  await page.goto(`/courses/${C}`);
  await expect(page.getByRole("heading", { name: "Browser Test Course", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark Lesson Complete", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Finish Course", exact: true })).toHaveCount(0);
  await login(page, backend, "other");
  await page.goto(`/courses/${C}`);
  await expect(page.getByRole("heading", { name: "Browser Test Course", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish Course", exact: true })).toHaveCount(0);
  backend.expectedHttp.push({ path: "/rpc/issue_course_certificate", status: 400 });
  const status = await page.evaluate(async ({ token, course }) => (await fetch("http://127.0.0.1:54321/rest/v1/rpc/issue_course_certificate", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: "isolated-e2e-public-key" },
    body: JSON.stringify({ target_course: course }),
  })).status, { token: backend.session("other").access_token, course: C });
  expect(status).toBe(400);
  expect(backend.rows.certificates).toHaveLength(0);
});
