import { test, expect, login, C, M, L, A, users } from "./fixture";

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`redesigned public routes fit ${width}px with keyboard and theme support`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    for (const path of [
      "/",
      "/about",
      "/courses",
      "/tutors",
      "/faq",
      "/contact",
      "/auth",
      "/reset-password",
      "/community",
      "/leaderboard",
      "/missing-page",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          { message: path },
        )
        .toBeLessThanOrEqual(1);
      if (["/", "/about", "/courses"].includes(path))
        await page.screenshot({
          path: info.outputPath(
            `${path.replaceAll("/", "") || "home"}-${width}.png`,
          ),
          fullPage: true,
        });
    }
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { name: "A clearer path to learning" }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    if (width < 1280)
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Switch language", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Switch to dark mode", exact: true })
      .click();
    if (width < 1280) await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(
      page.getByRole("heading", { name: "শেখার একটি সহজ পথ" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`about-bn-dark-${width}.png`),
      fullPage: true,
    });
  });
}

test("lesson resume, explicit review, history and persisted progress", async ({
  page,
  backend,
}) => {
  const second = "30000000-0000-4000-8000-000000000002";
  backend.rows.lessons.push({
    id: second,
    module_id: M,
    title: "Second lesson",
    type: "article",
    content: "Continue here",
    sort_order: 1,
  });
  backend.rows.enrollments.push({
    id: "enrolled",
    course_id: C,
    user_id: users.student.id,
  });
  backend.rows.lesson_progress.push({
    id: "progress",
    lesson_id: L,
    user_id: users.student.id,
    completed: true,
  });
  await login(page, backend, "student");
  await page
    .getByRole("link", { name: "Continue Learning", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Second lesson", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Previous Lesson", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`lesson=${L}`));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "First article", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next Lesson", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark Lesson Complete", exact: true })
    .click();
  await expect(
    page.getByText("2 / 2 lessons completed", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "First article", exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(backend.rows.lesson_progress.filter((p) => p.completed)).toHaveLength(
    2,
  );
  await expect(page.getByRole("link", { name: /Pass quiz:/ })).toBeVisible();
});

test("administrator defaults to management and explicit learning remains available", async ({
  page,
  backend,
}) => {
  backend.roleDelay = 400;
  await login(page, backend, "admin");
  await page.reload();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/dashboard?tab=learning");
  await expect(
    page.getByRole("tab", { name: "My Courses", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "New Course", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin Panel" }),
  ).toBeVisible();
});

test("teacher sees pending grading and course management without enrollment prompt", async ({
  page,
  backend,
}) => {
  backend.rows.submissions.push({
    id: "pending",
    assignment_id: A,
    student_id: users.student.id,
    status: "submitted",
    marks: null,
  });
  await login(page, backend, "teacher");
  await expect(
    page
      .getByRole("region", { name: "Pending grading" })
      .getByRole("link", { name: "Practice exercise" }),
  ).toBeVisible();
  await page.goto(`/courses/${C}`);
  await expect(
    page.getByRole("heading", { name: "Browser Test Course", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enroll Now", exact: true }),
  ).toHaveCount(0);
});

test("catalog sorting, category disclosure and clear filters are usable", async ({
  page,
}) => {
  await page.goto("/courses");
  await page
    .getByLabel("Search courses", { exact: true })
    .fill("No matching course");
  await expect(page.getByText(/No courses match/)).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Course" }),
  ).toBeVisible();
  await page.getByLabel("Sort courses").selectOption("oldest");
  await expect(page).toHaveURL(/sort=oldest/);
  await page.getByText("Categories · All", { exact: true }).click();
  await page.getByRole("button", { name: "Programming", exact: true }).click();
  await expect(page).toHaveURL(/category=Programming/);
});

for (const width of [320, 375, 768, 1024, 1440]) {
  for (const role of ["student", "teacher", "admin"] as const) {
    test(`${role} workspace and course actions fit ${width}px`, async ({
      page,
      backend,
    }, info) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => localStorage.setItem("theme", "light"));
      backend.rows.enrollments.push({
        id: "ux-enrollment",
        user_id: users[role].id,
        course_id: C,
      });
      await login(page, backend, role);
      const paths =
        role === "admin"
          ? ["/admin", "/admin?tab=support", "/admin?tab=audit"]
          : role === "teacher"
            ? [
                "/dashboard",
                "/dashboard?tab=live",
                `/courses/${C}`,
                "/analytics",
              ]
            : [
                "/dashboard",
                `/courses/${C}`,
                `/assignments/${A}`,
                "/certificates",
                "/profile",
                "/achievements",
              ];
      for (const path of paths) {
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible();
        await expect(page.locator("h1")).toBeVisible();
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth - innerWidth,
              ),
            { message: path },
          )
          .toBeLessThanOrEqual(1);
        if (role === "admin" && path === "/admin" && width < 768) {
          const action = page
            .getByRole("button", { name: "+ Teacher", exact: true })
            .first();
          await action.scrollIntoViewIfNeeded();
          await expect(action).toBeInViewport();
        }
        if (path === paths[0] || path === `/courses/${C}`)
          await page.screenshot({
            path: info.outputPath(
              `${role}-${path.includes("/courses/") ? "course" : "workspace"}-${width}.png`,
            ),
            fullPage: true,
          });
      }
    });
  }
}

test("dashboard read failure is recoverable and never looks like an empty enrollment list", async ({
  page,
  backend,
}) => {
  await login(page, backend, "student");
  const pattern = "**/rest/v1/enrollments?**";
  backend.expectedHttp.push({ path: "/enrollments", status: 503 });
  await page.route(pattern, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Service unavailable" }),
    }),
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("alert")).toContainText(
    "Could not load your workspace",
  );
  await expect(
    page.getByText("You're not enrolled in any courses yet"),
  ).toHaveCount(0);
  await page.unroute(pattern);
  await page.getByRole("button", { name: "Retry workspace" }).click();
  await expect(
    page.getByText("You're not enrolled in any courses yet"),
  ).toBeVisible();
});

test("all lessons completed leads to requirements and an issued certificate leads to certificates", async ({
  page,
  backend,
}) => {
  backend.rows.enrollments.push({
    id: "ux-enrolled",
    user_id: users.student.id,
    course_id: C,
  });
  backend.rows.lesson_progress.push({
    id: "ux-progress",
    user_id: users.student.id,
    lesson_id: L,
    completed: true,
  });
  await login(page, backend, "student");
  await expect(
    page.getByRole("link", { name: "Complete Requirements", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Complete Requirements", exact: true })
    .click();
  await expect(page.getByRole("link", { name: /Pass quiz:/ })).toBeVisible();
  backend.rows.certificates.push({
    id: "ux-certificate",
    user_id: users.student.id,
    course_id: C,
    validated_at: new Date().toISOString(),
    revoked_at: null,
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: "View Certificates", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue Learning", exact: true }),
  ).toHaveCount(0);
});

test("administrator with an actual teacher role can explicitly switch workspaces", async ({
  page,
  backend,
}) => {
  backend.rows.user_roles.push({
    id: "ux-dual-role",
    user_id: users.admin.id,
    role: "teacher",
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await login(page, backend, "admin");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Teaching workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/tab=teaching/);
  await expect(
    page.getByRole("button", { name: "New Course", exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard?tab=learning");
  await expect(
    page.getByRole("tab", { name: "My learning", exact: true }),
  ).toHaveAttribute("data-state", "active");
  await expect(
    page.getByRole("region", { name: "Pending assessments" }),
  ).toBeVisible();
});

test("notification failures keep unread state and keyboard activation opens the saved destination", async ({
  page,
  backend,
}) => {
  backend.rows.notifications.push({
    id: "ux-notice",
    user_id: users.student.id,
    title: "Lesson ready",
    message: "Open your course",
    type: "assignment",
    link: `/courses/${C}`,
    is_read: false,
    created_at: new Date().toISOString(),
  });
  await login(page, backend, "student");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  backend.expectedHttp.push({ path: "/notifications", status: 503 });
  const pattern = "**/rest/v1/notifications?**";
  await page.route(pattern, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Unavailable" }),
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Could not mark notifications as read",
  );
  expect(backend.rows.notifications[0].is_read).toBe(false);
  await page.unroute(pattern);
  const notification = page.getByRole("button", {
    name: /Lesson ready Open your course/,
  });
  await notification.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/courses/${C}$`));
  expect(backend.rows.notifications[0].is_read).toBe(true);
});
