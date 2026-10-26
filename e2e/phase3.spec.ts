import { test, expect, login, users, C, L, Q, A } from "./fixture";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
for (const width of [1440, 375]) {
  test(`tutoring discovery, independent confirmation, conflict, privacy and cancellation at ${width}px`, async ({
    page,
    backend,
    browser,
  }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    await login(page, backend, "student");
    await page.goto("/tutors");
    await page.getByLabel("Search subject or teacher").fill("programming");
    await page.getByRole("button", { name: "View profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Test teacher", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Request tutoring", exact: true })
      .click();
    await page
      .getByLabel("What would you like to learn?")
      .fill("Please help me learn algorithms.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(
      page.getByText("Tutoring requested", { exact: true }),
    ).toBeVisible();
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    await backend.install(context);
    const teacher = await context.newPage();
    try {
      await login(teacher, backend, "teacher");
      await teacher.goto("/dashboard?tab=tutoring");
      await teacher.getByRole("button", { name: "Accept request" }).click();
      await teacher
        .getByLabel("HTTPS meeting link")
        .fill("https://example.test/private-tutoring");
      await teacher
        .getByRole("button", { name: "Confirm change", exact: true })
        .click();
      await expect(teacher.getByText("Status: confirmed")).toBeVisible();
      await page.goto("/dashboard?tab=tutoring");
      await expect(
        page.getByRole("link", { name: "Join tutoring meeting" }),
      ).toHaveAttribute("href", "https://example.test/private-tutoring");
      // A stale booking request by a different authenticated fixture must fail.
      backend.expectedHttp.push({ path: "/rpc/request_tutoring", status: 400 });
      const conflict = await page.evaluate(
        async ({ token, slot }) =>
          (
            await fetch("http://127.0.0.1:54321/rest/v1/rpc/request_tutoring", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                apikey: "isolated-e2e-public-key",
              },
              body: JSON.stringify({
                target_slot: slot,
                message: "Competing request",
              }),
            })
          ).status,
        {
          token: backend.session("admin").access_token,
          slot: backend.rows.tutor_slots[0].id,
        },
      );
      expect(conflict).toBe(400);
      const outsider = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await backend.install(outsider);
      const stranger = await outsider.newPage();
      try {
        await login(stranger, backend, "other");
        await stranger.goto("/dashboard?tab=tutoring");
        await expect(
          stranger.getByRole("link", { name: "Join tutoring meeting" }),
        ).toHaveCount(0);
      } finally {
        await outsider.close();
      }
      await page.getByRole("button", { name: "Cancel session" }).click();
      await page
        .getByLabel("Note to participant (optional)")
        .fill("Please cancel my session.");
      await page
        .getByRole("button", { name: "Confirm change", exact: true })
        .click();
      await expect(page.getByText("Status: cancelled")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Join tutoring meeting" }),
      ).toHaveCount(0);
      await page.screenshot({
        path: info.outputPath(`tutoring-${width}.png`),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });
  test(`authoritative certificate workflow, actual PDF content, verification and revocation at ${width}px`, async ({
    page,
    backend,
    browser,
  }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    backend.rows.enrollments.push({
      id: "cert-enrollment",
      course_id: C,
      user_id: users.student.id,
    });
    await login(page, backend, "student");
    await page.goto(`/courses/${C}`);
    backend.expectedHttp.push({
      path: "/rpc/issue_course_certificate",
      status: 400,
    });
    await page
      .getByRole("button", { name: "Check certificate eligibility" })
      .click();
    await expect(
      page.getByText(/Complete all lessons, pass every quiz/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download PDF" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Mark Complete" }).click();
    await expect(
      page.getByRole("button", { name: "Completed", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start Quiz", exact: true }).click();
    await page.getByRole("radio", { name: "4", exact: true }).check();
    await page.getByRole("button", { name: "Submit Quiz" }).click();
    await expect(page.getByText("Score: 1/1")).toBeVisible();
    await page.goto(`/assignments/${A}`);
    await page.getByRole("button", { name: /Submit Assignment/ }).click();
    await page
      .getByPlaceholder(/github.com|https:\/\//)
      .fill("https://example.test/certificate-project");
    await page.getByRole("button", { name: /Submit$/ }).click();
    await expect(page.getByText("Your Submission")).toBeVisible();
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    await backend.install(context);
    const teacher = await context.newPage();
    try {
      await login(teacher, backend, "teacher");
      await teacher.goto(`/assignments/${A}`);
      await teacher
        .getByRole("button", { name: "Review", exact: true })
        .click();
      await teacher.getByLabel("Marks (out of 100)").fill("85");
      await teacher
        .getByLabel("Feedback", { exact: true })
        .fill("Completed learning activities");
      await teacher
        .getByRole("button", { name: "Save Review", exact: true })
        .click();
      await expect(teacher.getByText("85/100", { exact: true })).toBeVisible();
      await page.goto("/certificates");
      await page
        .getByRole("button", { name: "Check eligibility", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Download PDF", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Check eligibility", exact: true })
        .click();
      expect(backend.rows.certificates).toHaveLength(1);
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download PDF", exact: true })
        .click();
      const download = await pending;
      const path = await download.path();
      expect(path).not.toBeNull();
      const bytes = await readFile(path!);
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPages()[0].getWidth()).toBeGreaterThan(
        pdf.getPages()[0].getHeight(),
      );
      const content = execFileSync("pdftotext", ["-layout", path!, "-"], {
        encoding: "utf8",
      });
      expect(content).toContain("Certificate of Completion");
      expect(content).toContain("Test student");
      expect(content).toContain("Browser Test Course");
      expect(content).toContain(
        String(backend.rows.certificates[0].certificate_number),
      );
      expect(content).toContain("/certificates/verify/");
      const token = String(backend.rows.certificates[0].verification_token);
      await page.goto(`/certificates/verify/${token}`);
      await expect(
        page.getByText("Valid certificate", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Test student", { exact: true })).toHaveCount(
        0,
      );
      const adminContext = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await backend.install(adminContext);
      const administrator = await adminContext.newPage();
      try {
        await login(administrator, backend, "admin");
        await administrator.goto("/admin");
        await administrator
          .getByRole("tab", { name: "Certificates", exact: true })
          .click();
        await administrator
          .getByRole("button", { name: "Revoke certificate" })
          .click();
        await administrator
          .getByLabel("Reason for this change")
          .fill("Isolated revocation test");
        await administrator
          .getByRole("button", { name: "Confirm action", exact: true })
          .click();
      } finally {
        await adminContext.close();
      }
      await page.reload();
      await expect(page.getByText("revoked", { exact: true })).toBeVisible();
      await page.screenshot({
        path: info.outputPath(`certificate-verification-${width}.png`),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });
  test(`guest FAQ/contact validation, saved support, admin review and private notes at ${width}px`, async ({
    page,
    backend,
    browser,
  }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/faq");
    await page.getByLabel("Search questions").fill("refund");
    await page
      .getByRole("button", { name: "Are paid courses and refunds supported?" })
      .click();
    await expect(
      page.getByText(/payments and paid enrollment are not available/),
    ).toBeVisible();
    await page
      .getByRole("main")
      .getByRole("link", { name: "Contact Support", exact: true })
      .click();
    await page.getByRole("button", { name: "Send support request" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Please correct the highlighted fields.",
    );
    await page.getByLabel("Name", { exact: true }).fill("Guest learner");
    await page.getByLabel("Email", { exact: true }).fill("guest@example.test");
    await page
      .getByLabel("Subject", { exact: true })
      .fill("Help with a learning account");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Please help me understand teacher approval and support.");
    await page.getByRole("button", { name: "Send support request" }).click();
    await expect(
      page.getByText("Your support request was saved.", { exact: true }),
    ).toBeVisible();
    expect(backend.rows.support_tickets).toHaveLength(1);
    expect(backend.rows.support_tickets[0].user_id).toBeNull();
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    await backend.install(context);
    const administrator = await context.newPage();
    try {
      await login(administrator, backend, "admin");
      await administrator.goto("/admin");
      await administrator
        .getByRole("tab", { name: "Support", exact: true })
        .click();
      await administrator.getByRole("button", { name: "Open ticket" }).click();
      await expect(
        administrator.getByText(
          "Please help me understand teacher approval and support.",
          { exact: true },
        ),
      ).toBeVisible();
      await administrator
        .getByLabel("Ticket status")
        .selectOption("in_progress");
      await administrator
        .getByLabel("Internal note (optional)")
        .fill("Private investigation note");
      await administrator
        .getByRole("button", { name: "Confirm action", exact: true })
        .click();
      await expect(
        administrator
          .getByRole("cell")
          .getByText("in progress", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(() =>
          administrator.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      expect(await administrator.evaluate(() => innerWidth)).toBe(width);
      expect(
        (await administrator.getByLabel("Search support").boundingBox())!.width,
      ).toBeGreaterThan(250);
      await expect(administrator.getByRole("dialog")).toHaveCount(0);
      await administrator.evaluate(() => scrollTo(0, 0));
      await administrator.screenshot({
        animations: "disabled",
        path: info.outputPath(`admin-support-${width}.png`),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
    await login(page, backend, "student");
    await page.goto("/contact");
    await expect(
      page.getByText("Help with a learning account", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Private investigation note")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      )
      .toBeLessThanOrEqual(1);
  });
}
test("administrator reviews teacher course, paginates users and rejects nonadmin role modifications", async ({
  page,
  backend,
}, info) => {
  backend.rows.courses[1].review_status = "pending";
  for (let i = 0; i < 12; i++)
    backend.rows.profiles.push({
      id: `profile-${i}`,
      user_id: `00000000-0000-4000-9000-${String(i).padStart(12, "0")}`,
      full_name: `Additional learner ${i}`,
      created_at: new Date().toISOString(),
    });
  await login(page, backend, "admin");
  await page.goto("/admin");
  await expect(page.getByText("Total Users", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("16 records · Page 2 of 2")).toBeVisible();
  await page.getByLabel("Search users").fill("Test student");
  await page
    .getByRole("row")
    .filter({ hasText: "Test student" })
    .getByRole("button", { name: "+ Teacher", exact: true })
    .click();
  await page
    .getByLabel("Reason for this change")
    .fill("Verified isolated teacher request");
  await page
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect
    .poll(
      () =>
        backend.rows.user_roles.filter(
          (r) => r.user_id === users.student.id && r.role === "teacher",
        ).length,
    )
    .toBe(1);
  await page.getByRole("tab", { name: "Courses", exact: true }).click();
  await page.getByLabel("Filter", { exact: true }).selectOption("pending");
  await page.getByRole("button", { name: "Approve course" }).click();
  await page
    .getByLabel("Reason for this change")
    .fill("Reviewed course materials");
  await page
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect.poll(() => backend.rows.courses[1].is_published).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath("admin-courses.png"),
    fullPage: true,
  });
  backend.expectedHttp.push({ path: "/rpc/admin_set_role", status: 400 });
  const denied = await page.evaluate(
    async (token) =>
      (
        await fetch("http://127.0.0.1:54321/rest/v1/rpc/admin_set_role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: "isolated-e2e-public-key",
          },
          body: JSON.stringify({
            target_user: "00000000-0000-4000-8000-000000000001",
            target_role: "admin",
            grant_role: true,
            reason: "Escalation attempt",
          }),
        })
      ).status,
    backend.session("other").access_token,
  );
  expect(denied).toBe(400);
  expect(
    backend.rows.user_roles.some(
      (r) => r.user_id === users.student.id && r.role === "admin",
    ),
  ).toBe(false);
});
