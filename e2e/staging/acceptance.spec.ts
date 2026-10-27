import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { randomUUID } from "node:crypto";
import { solveChallenge } from "../../supabase/functions/_shared/supportProtocol";
import { mkdir, writeFile } from "node:fs/promises";
import { stagingSettings } from "./settings";

const settings = stagingSettings();
type Role = "student" | "teacher" | "admin";
const clients = {} as Record<Role, SupabaseClient<Database>>;
const uid = {} as Record<Role, string>;
const run = `staging-acceptance-${randomUUID()}`;
const course = randomUUID(),
  draft = randomUUID(),
  moduleId = randomUUID(),
  lesson = randomUUID();
const quiz = randomUUID(),
  question = randomUUID(),
  assignment = randomUUID(),
  live = randomUUID();
const room = `acceptance-${randomUUID()}`;
const object = `${course}/${run}.txt`;
const created: string[] = [];
let uploaded = false;
function ok(error: unknown) {
  // Do not serialize response objects, sessions, keys or passwords in reports.
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : "service-error";
  expect(error ? { code } : null).toBeNull();
}
async function login(page: Page, role: Role) {
  await page.goto("/auth");
  // locator.fill can echo its argument in failure call logs. Keep credentials out
  // of those logs while still using the real form and React input events.
  for (const [label, value] of [
    ["Email", settings!.identities[role].email],
    ["Password", settings!.identities[role].password],
  ] as const) {
    const input = page.getByLabel(label, { exact: true });
    await input.waitFor({ state: "visible" });
    await input.evaluate((element, credential) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(element, credential);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
}

test.describe("REAL Supabase staging acceptance (external opt-in)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !settings,
    "BLOCKED: no approved disposable staging target and external role credentials.",
  );
  test.beforeAll(async () => {
    for (const role of ["student", "teacher", "admin"] as const) {
      const client = createClient<Database>(settings!.url, settings!.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      clients[role] = client;
      const { data, error } = await client.auth.signInWithPassword(
        settings!.identities[role],
      );
      ok(error);
      expect(data.user).not.toBeNull();
      uid[role] = data.user!.id;
      const roles = await client
        .from("user_roles")
        .select("role")
        .eq("user_id", uid[role]);
      ok(roles.error);
      expect(roles.data?.map((row) => row.role)).toContain(role);
      if (role !== "admin")
        expect(roles.data?.map((row) => row.role)).not.toContain("admin");
      if (role === "student")
        expect(roles.data?.map((row) => row.role)).not.toContain("teacher");
    }
    expect(new Set(Object.values(uid)).size).toBe(3);
    await mkdir("artifacts/staging", { recursive: true, mode: 0o700 });
    // Persist exact cleanup IDs before the first write; no account credentials.
    await writeFile(
      `artifacts/staging/${run}.json`,
      JSON.stringify(
        {
          run,
          course,
          draft,
          moduleId,
          lesson,
          quiz,
          question,
          assignment,
          live,
          room,
          object,
          uid,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    for (const [id, published] of [
      [course, true],
      [draft, false],
    ] as const) {
      ok(
        (
          await clients.teacher.from("courses").insert({
            id,
            teacher_id: uid.teacher,
            title: run,
            is_published: false,
            price_bdt: 0,
          })
        ).error,
      );
      created.push(id);
      if (published) {
        ok(
          (
            await clients.teacher.rpc("request_course_review", {
              target_course: id,
            })
          ).error,
        );
        ok(
          (
            await clients.admin.rpc("admin_course_action", {
              target_course: id,
              action: "approve",
              reason: "Disposable acceptance fixture review",
            })
          ).error,
        );
      }
    }
    ok(
      (
        await clients.teacher.from("modules").insert({
          id: moduleId,
          course_id: course,
          title: "Acceptance module",
        })
      ).error,
    );
    ok(
      (
        await clients.teacher.from("lessons").insert({
          id: lesson,
          module_id: moduleId,
          title: "Acceptance lesson",
          type: "article",
          content: "# Staging acceptance lesson",
        })
      ).error,
    );
    ok(
      (
        await clients.teacher
          .from("quizzes")
          .insert({ id: quiz, course_id: course, title: "Acceptance quiz" })
      ).error,
    );
    ok(
      (
        await clients.teacher.from("quiz_questions").insert({
          id: question,
          quiz_id: quiz,
          question: "2 + 2?",
          options: ["3", "4"],
          correct_answer: 1,
        })
      ).error,
    );
    ok(
      (
        await clients.teacher.from("assignments").insert({
          id: assignment,
          course_id: course,
          teacher_id: uid.teacher,
          title: "Acceptance assignment",
          max_marks: 100,
        })
      ).error,
    );
    if (settings!.realtime)
      ok(
        (
          await clients.teacher.from("live_classes").insert({
            id: live,
            course_id: course,
            teacher_id: uid.teacher,
            title: run,
            room_name: room,
            scheduled_at: new Date(Date.now() + 3600000).toISOString(),
          })
        ).error,
      );
  });
  test.afterAll(async () => {
    const failures: string[] = [];
    if (
      uploaded &&
      (await clients.teacher.storage.from("lesson-files").remove([object]))
        .error
    )
      failures.push("owned object cleanup");
    for (const id of created) {
      const result = await clients.teacher
        .from("courses")
        .delete()
        .eq("id", id)
        .eq("teacher_id", uid.teacher)
        .eq("title", run)
        .select("id");
      if (result.error || result.data?.length !== 1)
        failures.push("owned course cleanup");
    }
    for (const client of Object.values(clients)) {
      await client.removeAllChannels();
      await client.auth.signOut({ scope: "local" });
    }
    expect(
      failures,
      "Inspect the exact-ID cleanup manifest; notification cleanup is an operator step.",
    ).toEqual([]);
  });

  for (const role of ["student", "teacher", "admin"] as const)
    test(`${role}: real login, reload, role boundary and logout`, async ({
      page,
    }) => {
      await login(page, role);
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Account menu" }),
      ).toBeVisible();
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", {
          name:
            role === "admin"
              ? "Admin Panel"
              : "You don't have access to this page",
        }),
      ).toBeVisible();
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: /Sign Out/i }).click();
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/auth/);
      // The application's global logout also revokes this role's independent
      // SDK session. REST can still accept its unexpired JWT, while getUser in
      // Edge Functions correctly rejects the revoked session. Reauthenticate
      // the test driver rather than weakening the deployed session checks.
      const driver = await clients[role].auth.signInWithPassword(
        settings!.identities[role],
      );
      ok(driver.error);
      expect(driver.data.user?.id).toBe(uid[role]);
      const active = await clients[role].auth.getUser();
      ok(active.error);
      expect(active.data.user?.id).toBe(uid[role]);
    });

  test("unenrolled content and draft access are denied", async () => {
    const lessons = await clients.student
      .from("lessons")
      .select("id,content")
      .eq("id", lesson);
    ok(lessons.error);
    expect(lessons.data).toEqual([]);
    const drafts = await clients.student
      .from("courses")
      .select("id")
      .eq("id", draft);
    ok(drafts.error);
    expect(drafts.data).toEqual([]);
    expect(
      (
        await clients.student
          .from("enrollments")
          .insert({ course_id: draft, user_id: uid.student })
      ).error,
    ).not.toBeNull();
  });
  test("teacher edits owned course through the actual UI", async ({ page }) => {
    await login(page, "teacher");
    await page.goto(`/courses/${course}`);
    await page.getByRole("button", { name: "Edit course information" }).click();
    await page
      .getByLabel("Course description", { exact: true })
      .fill("Disposable staging acceptance");
    await page.getByRole("button", { name: "Save course information" }).click();
    await expect(
      page.getByText("Course updated", { exact: true }),
    ).toBeVisible();
    const row = await clients.teacher
      .from("courses")
      .select("description")
      .eq("id", course)
      .single();
    ok(row.error);
    expect(row.data?.description).toBe("Disposable staging acceptance");
    ok(
      (
        await clients.teacher.rpc("request_course_review", {
          target_course: course,
        })
      ).error,
    );
    ok(
      (
        await clients.admin.rpc("admin_course_action", {
          target_course: course,
          action: "approve",
          reason: "Reviewed acceptance edit",
        })
      ).error,
    );
  });
  test("student enrollment and progress persist in PostgreSQL after reload", async ({
    page,
  }) => {
    await login(page, "student");
    await page.goto(`/courses/${course}`);
    await page.getByRole("button", { name: "Enroll Now", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Staging acceptance lesson" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mark Lesson Complete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Completed", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Completed", exact: true }),
    ).toBeVisible();
    const row = await clients.student
      .from("lesson_progress")
      .select("completed")
      .eq("lesson_id", lesson)
      .eq("user_id", uid.student)
      .single();
    ok(row.error);
    expect(row.data?.completed).toBe(true);
  });
  test("quiz answer keys stay private, forged scores fail and UI result is server stored", async ({
    page,
  }) => {
    expect(
      (
        await clients.student
          .from("quiz_questions")
          .select("correct_answer")
          .eq("quiz_id", quiz)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await clients.student.from("quiz_attempts").insert({
          quiz_id: quiz,
          user_id: uid.student,
          score: 999,
          total_points: 1,
          passed: true,
        })
      ).error,
    ).not.toBeNull();
    await login(page, "student");
    await page.goto(`/courses/${course}`);
    await page.getByRole("button", { name: "Start Quiz", exact: true }).click();
    await page.getByRole("radio", { name: "4", exact: true }).check();
    await page.getByRole("button", { name: "Submit Quiz" }).click();
    await expect(page.getByText("Score: 1/1")).toBeVisible();
    const rows = await clients.student
      .from("quiz_attempts")
      .select("score,total_points,passed")
      .eq("quiz_id", quiz);
    ok(rows.error);
    expect(rows.data).toEqual([{ score: 1, total_points: 1, passed: true }]);
  });
  test("student submits, cannot self-grade, teacher grades, student reloads result", async ({
    page,
    browser,
  }) => {
    await login(page, "student");
    await page.goto(`/assignments/${assignment}`);
    await page.getByRole("button", { name: /Submit Assignment/ }).click();
    await page
      .getByPlaceholder(/github.com|https:\/\//)
      .fill("https://example.test/staging-assignment");
    await page.getByRole("button", { name: /Submit$/ }).click();
    await expect(page.getByText("Your Submission")).toBeVisible();
    const row = await clients.student
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignment)
      .single();
    ok(row.error);
    expect(
      (
        await clients.student
          .from("submissions")
          .update({ marks: 100, status: "graded" })
          .eq("id", row.data!.id)
      ).error,
    ).not.toBeNull();
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:18081",
    });
    const teacherPage = await context.newPage();
    const gradeNotices: Record<string, unknown>[] = [];
    const notifications = clients.student
      .channel(`notifications-${uid.student}`, {
        config: { private: true, postgres_changes_options: { wait: true, timeout: 15_000 } },
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${uid.student}`,
      }, ({ new: notice }) => gradeNotices.push(notice));
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Private notification subscription timed out")), 20_000);
        notifications.subscribe((status) => {
          if (status === "SUBSCRIBED") { clearTimeout(timer); resolve(); }
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timer); reject(new Error("Private notification subscription denied"));
          }
        });
      });
      await login(teacherPage, "teacher");
      await teacherPage.goto(`/assignments/${assignment}`);
      await teacherPage
        .getByRole("button", { name: "Review", exact: true })
        .click();
      await teacherPage.getByLabel("Marks (out of 100)").fill("90");
      await teacherPage
        .getByLabel("Feedback", { exact: true })
        .fill("Acceptance feedback");
      await teacherPage
        .getByRole("button", { name: "Save Review", exact: true })
        .click();
      await expect(
        teacherPage.getByText("90/100", { exact: true }),
      ).toBeVisible();
      await expect.poll(() => gradeNotices.some(notice =>
        notice.type === "grade" && notice.link === `/assignments/${assignment}`,
      )).toBe(true);
      await page.reload();
      await expect(
        page.getByText("Marks: 90/100", { exact: true }),
      ).toBeVisible();
    } finally {
      await clients.student.removeChannel(notifications);
      await context.close();
    }
  });
  test("cross-user writes and private bookmark reads are denied", async () => {
    const changed = await clients.student
      .from("courses")
      .update({ description: "unauthorized" })
      .eq("id", course)
      .select("id");
    expect(changed.error !== null || changed.data?.length === 0).toBe(true);
    const row = await clients.teacher
      .from("courses")
      .select("description")
      .eq("id", course)
      .single();
    ok(row.error);
    expect(row.data?.description).toBe("Disposable staging acceptance");
    ok(
      (
        await clients.student
          .from("lesson_bookmarks")
          .insert({ user_id: uid.student, lesson_id: lesson })
      ).error,
    );
    const hidden = await clients.teacher
      .from("lesson_bookmarks")
      .select("id")
      .eq("lesson_id", lesson);
    ok(hidden.error);
    expect(hidden.data).toEqual([]);
  });
  test("real Storage: authorized signing/download, anonymous read and cross-owner upload denial", async () => {
    ok(
      (
        await clients.teacher.storage
          .from("lesson-files")
          .upload(object, Buffer.from(run), { contentType: "text/plain" })
      ).error,
    );
    uploaded = true;
    const signed = await clients.student.storage
      .from("lesson-files")
      .createSignedUrl(object, 60);
    ok(signed.error);
    // Native fetch avoids Playwright API call logs recording signed bearer URLs.
    const download = await fetch(signed.data!.signedUrl, {
      signal: AbortSignal.timeout(10000),
    }).catch(() => {
      throw new Error("Signed object download failed");
    });
    expect(download.ok).toBe(true);
    expect(await download.text()).toBe(run);
    const publicUrl = clients.teacher.storage
      .from("lesson-files")
      .getPublicUrl(object).data.publicUrl;
    const publicRead = await fetch(publicUrl, {
      signal: AbortSignal.timeout(10000),
    }).catch(() => {
      throw new Error("Anonymous object check failed");
    });
    expect(publicRead.ok).toBe(false);
    const denied = await clients.student.storage
      .from("lesson-files")
      .upload(`${course}/${run}-denied.txt`, Buffer.from(run), {
        contentType: "text/plain",
      });
    if (!denied.error) {
      await clients.teacher.storage
        .from("lesson-files")
        .remove([`${course}/${run}-denied.txt`]);
    }
    expect(denied.error).not.toBeNull();
  });
  test("real private Realtime receives server-stamped identity and rejects teacher-event spoofing", async () => {
    test.skip(
      !settings!.realtime,
      "BLOCKED: STAGING_REALTIME=enabled requires private-only settings/policy review.",
    );
    const messages: Record<string, unknown>[] = [];
    const channel = clients.student
      .channel(`live-${room}`, { config: { private: true } })
      .on("broadcast", { event: "chat-message" }, ({ payload }) =>
        messages.push(payload),
      );
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Private subscription timed out")),
          15000,
        );
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timer);
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timer);
            reject(new Error("Private subscription denied"));
          }
        });
      });
      ok(
        (
          await clients.teacher.rpc("send_live_signal", {
            room,
            signal_event: "chat-message",
            signal_payload: { message: run, userId: uid.student },
          })
        ).error,
      );
      await expect.poll(() => messages.length).toBe(1);
      expect(messages[0].userId).toBe(uid.teacher);
      expect(
        (
          await clients.student.rpc("send_live_signal", {
            room,
            signal_event: "teacher-ended",
            signal_payload: {},
          })
        ).error,
      ).not.toBeNull();
    } finally {
      await clients.student.removeChannel(channel);
    }
  });
  test("real tutoring RPC lifecycle reserves and cancels a private booking", async () => {
    const start = new Date(Date.now() + 7 * 86400000).toISOString();
    const slots = await clients.teacher.rpc("save_tutor_slot", {
      slot_id: null,
      subject: run,
      starts: start,
      duration_minutes: 45,
      zone: "UTC",
      repeat_weeks: 1,
    });
    ok(slots.error);
    const slotId = slots.data![0].id;
    await writeFile(
      `artifacts/staging/${run}-tutoring.json`,
      JSON.stringify({ run, slotId }),
      { mode: 0o600 },
    );
    try {
      const requested = await clients.student.rpc("request_tutoring", {
        target_slot: slotId,
        message: "Disposable acceptance request",
      });
      ok(requested.error);
      const id = requested.data!.id;
      expect(
        (
          await clients.student.rpc("decide_tutoring", {
            request_id: id,
            action: "approve",
            meeting_link: "https://example.test/acceptance",
          })
        ).error,
      ).not.toBeNull();
      ok(
        (
          await clients.teacher.rpc("decide_tutoring", {
            request_id: id,
            action: "approve",
            meeting_link: "https://example.test/acceptance",
          })
        ).error,
      );
      const saved = await clients.student
        .from("tutoring_requests")
        .select("status,meeting_url")
        .eq("id", id)
        .single();
      ok(saved.error);
      expect(saved.data?.status).toBe("approved");
      ok(
        (
          await clients.student.rpc("decide_tutoring", {
            request_id: id,
            action: "cancel",
          })
        ).error,
      );
      const cancelled = await clients.student
        .from("tutoring_requests")
        .select("status,meeting_url")
        .eq("id", id)
        .single();
      ok(cancelled.error);
      expect(cancelled.data?.meeting_url).toBeNull();
    } finally {
      ok(
        (
          await clients.teacher.rpc("cancel_tutor_slot", {
            target_slot: slotId,
          })
        ).error,
      );
    }
  });
  test("real automatic certificate is idempotent and public verification omits recipient data", async () => {
    const first = await clients.student.rpc("issue_course_certificate", {
      target_course: course,
    });
    ok(first.error);
    const second = await clients.student.rpc("issue_course_certificate", {
      target_course: course,
    });
    ok(second.error);
    expect(first.data?.id).toBe(second.data?.id);
    const verify = await clients.student.rpc("verify_certificate", {
      token: first.data!.verification_token,
    });
    ok(verify.error);
    expect(verify.data).toMatchObject({ status: "valid" });
    expect(verify.data).not.toHaveProperty("student_name");
    expect(
      (
        await clients.teacher.rpc("certificate_download_record", {
          certificate_id: first.data!.id,
        })
      ).error,
    ).not.toBeNull();
  });
  test("real certificate PDF function returns an authenticated PDF", async () => {
    test.skip(
      !settings!.functions,
      "BLOCKED: deploy/review both Edge Functions and enable STAGING_FUNCTIONS.",
    );
    const cert = await clients.student.rpc("issue_course_certificate", {
      target_course: course,
    });
    ok(cert.error);
    const response = await clients.student.functions.invoke("certificate-pdf", {
      body: { certificate_id: cert.data!.id },
    });
    ok(response.error);
    expect(response.data instanceof Blob).toBe(true);
    expect(
      new TextDecoder().decode((await response.data.arrayBuffer()).slice(0, 5)),
    ).toBe("%PDF-");
  });
  test("real support intake associates the JWT and protects private tickets and notes", async () => {
    test.skip(
      !settings!.functions,
      "BLOCKED: authorized support Edge Function/configuration required.",
    );
    const fields = {
      name: "Acceptance learner",
      email: settings!.identities.student.email,
      category: "technical",
      subject: run,
      message: "Disposable real staging acceptance request.",
    };
    const headers = {
      "Content-Type": "application/json",
      apikey: settings!.key,
    };
    const challenge = await fetch(
      `${settings!.url}/functions/v1/support-contact`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "challenge", email: fields.email }),
      },
    );
    expect(challenge.ok).toBe(true);
    const { token } = await challenge.json();
    const counter = await solveChallenge(token);
    const result = await clients.student.functions.invoke("support-contact", {
      body: { ...fields, token, counter },
    });
    ok(result.error);
    const id = result.data.ticket_id as string;
    await writeFile(
      `artifacts/staging/${run}-support.json`,
      JSON.stringify({ run, id }),
      { mode: 0o600 },
    );
    const hidden = await clients.teacher
      .from("support_tickets")
      .select("id")
      .eq("id", id);
    ok(hidden.error);
    expect(hidden.data).toEqual([]);
    ok(
      (
        await clients.admin.rpc("admin_support_action", {
          ticket_id: id,
          next_status: "resolved",
          internal_note: "Disposable acceptance note",
        })
      ).error,
    );
    const notes = await clients.student
      .from("support_notes")
      .select("id")
      .eq("ticket_id", id);
    ok(notes.error);
    expect(notes.data).toEqual([]);
  });
  test("real admin reports are scoped and student role escalation is rejected", async () => {
    ok((await clients.admin.rpc("admin_overview", {})).error);
    const rows = await clients.admin.rpc("admin_records", {
      kind: "courses",
      search: run,
      page_size: 10,
    });
    ok(rows.error);
    expect(
      (await clients.student.rpc("admin_overview", {})).error,
    ).not.toBeNull();
    expect(
      (
        await clients.student.rpc("admin_set_role", {
          target_user: uid.student,
          target_role: "admin",
          grant_role: true,
          reason: "Must be rejected",
        })
      ).error,
    ).not.toBeNull();
  });
});
