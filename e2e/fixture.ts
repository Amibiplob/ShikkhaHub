import { mockOrigin } from "./target";
import { phase3Rpc, phase3Service } from "./phase3-fixture";
import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";

type Row = Record<string, unknown>;
export const C = "10000000-0000-4000-8000-000000000001";
export const D = "10000000-0000-4000-8000-000000000002";
export const M = "20000000-0000-4000-8000-000000000001";
export const L = "30000000-0000-4000-8000-000000000001";
export const Q = "40000000-0000-4000-8000-000000000001";
export const A = "60000000-0000-4000-8000-000000000001";
export const users = {
  student: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "student@example.test",
  },
  teacher: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "teacher@example.test",
  },
  other: {
    id: "00000000-0000-4000-8000-000000000003",
    email: "other@example.test",
  },
  admin: {
    id: "00000000-0000-4000-8000-000000000004",
    email: "admin@example.test",
  },
};
export type Role = keyof typeof users;

// Contract simulation only: real browser + real Supabase SDK, simulated HTTP/auth
// and Realtime. SQL authorization is exercised separately in tests/database.test.mjs.
export class Backend {
  password = randomBytes(24).toString("base64url");
  rows: Record<string, Row[]>;
  mutations: { table: string; method: string; body: Row }[] = [];
  expectedHttp: { path: string; status: number }[] = [];
  deniedProgress = false;
  deniedBookmarks = false;
  roleDelay = 0;
  sockets: { send: (message: string) => void; topics: Set<string> }[] = [];
  constructor() {
    const now = new Date().toISOString();
    this.rows = {
      profiles: Object.entries(users).map(([name, u]) => ({
        id: randomUUID(),
        user_id: u.id,
        full_name: `Test ${name}`,
        bio: "Patient teaching and practical exercises",
        avatar_url: null,
        created_at: now,
      })),
      user_roles: Object.entries(users).map(([name, u]) => ({
        id: randomUUID(),
        user_id: u.id,
        role: name === "other" ? "teacher" : name,
      })),
      courses: [
        {
          id: C,
          teacher_id: users.teacher.id,
          title: "Browser Test Course",
          description: "Learn with safe test data",
          category: "Programming",
          difficulty: "beginner",
          review_status: "approved",
          is_published: true,
          created_at: now,
        },
        {
          id: D,
          teacher_id: users.other.id,
          title: "Other Teacher Draft",
          description: "Private draft",
          is_published: false,
          created_at: now,
        },
      ],
      modules: [{ id: M, course_id: C, title: "Introduction", sort_order: 0 }],
      lessons: [
        {
          id: L,
          module_id: M,
          title: "First article",
          type: "article",
          content: "# Learn safely\n\nBrowser lesson content.",
          sort_order: 0,
        },
      ],
      assignments: [
        {
          id: A,
          course_id: C,
          teacher_id: users.teacher.id,
          title: "Practice exercise",
          description: "Submit an HTTPS repository",
          max_marks: 100,
          submission_types: ["github", "url", "file"],
          created_at: now,
        },
      ],
      quizzes: [
        {
          id: Q,
          course_id: C,
          title: "Basics quiz",
          pass_percentage: 70,
          created_at: now,
        },
      ],
      quiz_questions: [
        {
          id: "50000000-0000-4000-8000-000000000001",
          quiz_id: Q,
          question: "2 + 2?",
          options: ["3", "4"],
          correct_answer: 1,
          points: 1,
          sort_order: 0,
        },
      ],
      community_posts: [
        {
          id: "70000000-0000-4000-8000-000000000001",
          user_id: users.teacher.id,
          title: "Welcome discussion",
          content: "Ask a question",
          category: "general",
          is_pinned: false,
          is_reported: false,
          created_at: now,
        },
      ],
      tutor_slots: [
        {
          id: "80000000-0000-4000-8000-000000000001",
          teacher_id: users.teacher.id,
          subject: "Programming tutoring",
          timezone: "Asia/Dhaka",
          cancelled_at: null,
          is_reserved: false,
          starts_at: "2030-10-26T10:00:00Z",
          ends_at: "2030-10-26T11:00:00Z",
          created_at: now,
        },
      ],
      live_classes: [
        {
          id: "90000000-0000-4000-8000-000000000001",
          course_id: C,
          teacher_id: users.teacher.id,
          title: "Test live class",
          room_name: "test-room",
          status: "scheduled",
          scheduled_at: "2026-10-25T10:00:00Z",
          duration_minutes: 60,
          created_at: now,
        },
      ],
    };
    for (const name of [
      "enrollments",
      "lesson_bookmarks",
      "quiz_attempts",
      "course_prerequisites",
      "lesson_progress",
      "submissions",
      "course_bookmarks",
      "course_discussions",
      "community_comments",
      "community_upvotes",
      "course_reviews",
      "class_recordings",
      "notifications",
      "certificates",
      "badges",
      "user_badges",
      "teacher_requests",
      "tutoring_requests",
      "tutor_profiles",
      "admin_audit_log",
      "support_tickets",
      "support_notes",
    ])
      this.rows[name] = [];
  }
  userFrom(headers: Record<string, string>) {
    try {
      const token = headers.authorization?.replace("Bearer ", "");
      return JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      ).sub as string;
    } catch {
      return "";
    }
  }
  session(role: Role) {
    const u = users[role];
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: u.id, role: "authenticated", exp, aud: "authenticated" })).toString("base64url")}.test-signature`;
    return {
      access_token: token,
      refresh_token: `disposable-${role}`,
      expires_in: 3600,
      expires_at: exp,
      token_type: "bearer",
      user: {
        ...u,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: { provider: "email" },
        user_metadata: { full_name: `Test ${role}` },
        created_at: new Date().toISOString(),
      },
    };
  }
  join(table: string, row: Row, select: string): Row {
    const r = { ...row };
    if (select.includes("profiles"))
      r.profiles =
        this.rows.profiles.find(
          (p) =>
            p.user_id === (row.teacher_id || row.student_id || row.user_id),
        ) || null;
    if (select.includes("courses(")) {
      const c = this.rows.courses.find((c) => c.id === row.course_id);
      r.courses = c
        ? this.join("courses", c, select.slice(select.indexOf("courses(")))
        : null;
    }
    if (select.includes("lessons("))
      r.lessons = this.rows.lessons.filter((l) => l.module_id === row.id);
    if (select.includes("live_classes"))
      r.live_classes = this.rows.live_classes.find(
        (l) => l.id === row.live_class_id,
      );
    if (select.includes("enrollments(count)"))
      r.enrollments = [
        {
          count: this.rows.enrollments.filter((e) => e.course_id === row.id)
            .length,
        },
      ];
    return r;
  }
  async install(context: BrowserContext) {
    await context.routeWebSocket("**/realtime/v1/**", (socket) => {
      const client = {
        send: (message: string) => socket.send(message),
        topics: new Set<string>(),
      };
      this.sockets.push(client);
      socket.onMessage((message) => {
        if (typeof message !== "string") return;
        const decoded = JSON.parse(message);
        const [join, ref, topic, event, payload] = Array.isArray(decoded)
          ? decoded
          : [
              decoded.join_ref,
              decoded.ref,
              decoded.topic,
              decoded.event,
              decoded.payload,
            ];
        if (event === "phx_join") client.topics.add(topic);
        if (event === "phx_leave") client.topics.delete(topic);
        if (["phx_join", "phx_leave", "heartbeat"].includes(event))
          socket.send(
            JSON.stringify([
              join,
              ref,
              topic,
              "phx_reply",
              {
                status: "ok",
                response: {
                  postgres_changes: (
                    payload?.config?.postgres_changes || []
                  ).map((c: Row, i: number) => ({ ...c, id: i })),
                },
              },
            ]),
          );
      });
      socket.onClose(() => {
        this.sockets = this.sockets.filter((s) => s !== client);
      });
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === mockOrigin) return route.continue();
      if (url.origin !== "http://127.0.0.1:54321") return route.abort();
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-expose-headers": "content-range",
        "content-type": "application/json",
      };
      const respond = (data: unknown, status = 200, extra = {}) =>
        route.fulfill({
          status,
          headers: { ...headers, ...extra },
          body: JSON.stringify(data),
        });
      if (request.method() === "OPTIONS") return respond({});
      const uid = this.userFrom(request.headers());
      const body = (
        request.postData() &&
        request.headers()["content-type"]?.includes("application/json")
          ? JSON.parse(request.postData()!)
          : {}
      ) as Row;
      if (url.pathname.includes("/auth/v1/token")) {
        if (url.searchParams.get("grant_type") === "refresh_token")
          return respond(
            {
              error: "invalid_grant",
              error_code: "refresh_token_not_found",
              msg: "Refresh token not found",
            },
            400,
          );
        const role = (Object.keys(users) as Role[]).find(
          (r) => users[r].email === body.email,
        );
        if (!role || body.password !== this.password)
          return respond(
            {
              msg: "Invalid login credentials",
              error_description: "Invalid login credentials",
            },
            400,
          );
        return respond(this.session(role));
      }
      if (url.pathname.includes("/auth/v1/signup")) {
        this.mutations.push({ table: "auth.signup", method: "POST", body });
        return respond({
          user: { id: randomUUID(), email: body.email },
          session: null,
        });
      }
      if (url.pathname.includes("/auth/v1/logout")) return respond({});
      if (url.pathname.includes("/auth/v1/user"))
        return respond(
          Object.values(users).find((u) => u.id === uid) || {},
          uid ? 200 : 401,
        );
      if (url.pathname.includes("/auth/v1/recover")) return respond({});
      if (url.pathname.includes("/rpc/")) {
        const fn = url.pathname.split("/").pop();
        const phase3 = phase3Rpc(this, fn!, body, uid);
        if (phase3.handled)
          return respond(
            phase3.error ? { message: phase3.error } : phase3.data,
            phase3.error ? 400 : 200,
          );
        if (fn === "send_live_signal") {
          const payload = {
            ...(body.signal_payload as Row),
            fromId: uid,
            userId: uid,
            userName: this.rows.profiles.find((p) => p.user_id === uid)
              ?.full_name,
            studentId: uid,
            studentName: this.rows.profiles.find((p) => p.user_id === uid)
              ?.full_name,
          };
          const topic = `realtime:live-${body.room}`;
          for (const socket of this.sockets)
            if (socket.topics.has(topic))
              socket.send(
                JSON.stringify([
                  null,
                  null,
                  topic,
                  "broadcast",
                  { event: body.signal_event, payload, type: "broadcast" },
                ]),
              );
          return respond(null);
        }
        if (fn === "get_leaderboard") return respond([]);
        if (fn === "get_platform_stats")
          return respond({ courses: 1, students: 1, live_classes: 1 });
        if (fn === "read_quiz_questions")
          return respond(
            this.rows.quiz_questions
              .filter((q) => q.quiz_id === body.target_quiz)
              .map((q) => {
                const value = { ...q };
                if (uid !== users.teacher.id) delete value.correct_answer;
                return value;
              }),
          );
        if (fn === "submit_quiz") {
          const questions = this.rows.quiz_questions.filter(
            (q) => q.quiz_id === body.target_quiz,
          );
          const answers = body.submitted_answers as Record<string, number>;
          const score = questions.reduce(
            (n, q) =>
              n +
              (answers[String(q.id)] === q.correct_answer
                ? Number(q.points)
                : 0),
            0,
          );
          const total = questions.reduce((n, q) => n + Number(q.points), 0);
          const attempt = {
            id: randomUUID(),
            quiz_id: body.target_quiz,
            user_id: uid,
            score,
            total_points: total,
            passed: score / total >= 0.7,
            completed_at: new Date().toISOString(),
          };
          this.rows.quiz_attempts.push(attempt);
          return respond(attempt);
        }
        if (fn === "review_teacher_request") {
          const r = this.rows.teacher_requests.find(
            (r) => r.id === body.request_id,
          );
          if (r) {
            r.status = body.approve ? "approved" : "dismissed";
            if (body.approve)
              this.rows.user_roles.push({
                id: randomUUID(),
                user_id: r.user_id,
                role: "teacher",
              });
          }
          return respond(null);
        }
        return respond(null);
      }
      if (url.pathname.includes("/functions/v1/")) {
        const result = await phase3Service(
          this,
          new Request(url, {
            method: request.method(),
            headers: request.headers(),
            body: request.postData() || undefined,
          }),
        );
        if (result)
          return route.fulfill({
            status: result.status,
            headers: { ...headers, ...Object.fromEntries(result.headers) },
            body: Buffer.from(await result.arrayBuffer()),
          });
      }
      if (url.pathname.includes("/storage/v1/object/sign/"))
        return respond({ signedURL: "/object/sign/test?token=disposable" });
      if (url.pathname.includes("/storage/v1/"))
        return respond({ Key: "test-file" });
      const table = url.pathname.split("/").pop()!;
      if (!this.rows[table])
        return respond(
          { message: `Unimplemented fixture table: ${table}` },
          500,
        );
      if (table === "user_roles" && this.roleDelay)
        await new Promise((r) => setTimeout(r, this.roleDelay));
      const matches = (r: Row) =>
        [...url.searchParams].every(([key, value]) => {
          if (
            [
              "select",
              "order",
              "limit",
              "offset",
              "on_conflict",
              "or",
            ].includes(key)
          )
            return true;
          if (value === "is.null") return r[key] == null;
          if (value.startsWith("gt.")) return String(r[key]) > value.slice(3);
          if (value.startsWith("eq.")) return String(r[key]) === value.slice(3);
          if (value.startsWith("ilike."))
            return String(r[key] || "")
              .toLowerCase()
              .includes(value.slice(6).replaceAll("%", "").toLowerCase());
          if (value.startsWith("in."))
            return value
              .slice(4, -1)
              .replaceAll('"', "")
              .split(",")
              .includes(String(r[key]));
          return true;
        });
      let filtered = this.rows[table].filter(matches);
      if (table === "courses" && uid !== users.admin.id)
        filtered = filtered.filter(
          (r) => r.is_published || r.teacher_id === uid,
        );
      if (table === "user_roles" && uid !== users.admin.id)
        filtered = filtered.filter((r) => r.user_id === uid);
      if (
        ["certificates", "support_tickets"].includes(table) &&
        uid !== users.admin.id
      )
        filtered = filtered.filter((r) => r.user_id === uid);
      if (table === "support_notes" && uid !== users.admin.id) filtered = [];
      if (table === "tutoring_requests")
        filtered = filtered.filter(
          (r) =>
            r.student_id === uid ||
            this.rows.tutor_slots.some(
              (s) => s.id === r.slot_id && s.teacher_id === uid,
            ),
        );
      if (
        request.method() !== "GET" &&
        request.method() !== "HEAD" &&
        table === "user_roles"
      )
        return respond({ message: "Use trusted role operation" }, 403);
      if (request.method() === "POST") {
        if (table === "course_bookmarks" && this.deniedBookmarks)
          return respond({ message: "Bookmark denied by fixture" }, 403);
        if (table === "lesson_progress" && this.deniedProgress)
          return respond({ message: "Progress denied by fixture" }, 403);
        const input = Array.isArray(body) ? body : [body];
        filtered = [];
        for (const values of input) {
          const row = {
            id: randomUUID(),
            created_at: new Date().toISOString(),
            sort_order: 0,
            submitted_at: new Date().toISOString(),
            status: table === "submissions" ? "submitted" : "pending",
            ...values,
          };
          const conflict = url.searchParams.get("on_conflict");
          const existing =
            conflict &&
            this.rows[table].find((r) =>
              conflict.split(",").every((k) => r[k] === row[k]),
            );
          if (existing) {
            Object.assign(existing, row, { id: existing.id });
            filtered.push(existing);
          } else {
            this.rows[table].push(row);
            filtered.push(row);
          }
          this.mutations.push({ table, method: "POST", body: values });
        }
      } else if (request.method() === "PATCH") {
        for (const row of filtered) Object.assign(row, body);
        this.mutations.push({ table, method: "PATCH", body });
      } else if (request.method() === "DELETE") {
        this.rows[table] = this.rows[table].filter(
          (r) => !filtered.includes(r),
        );
        this.mutations.push({ table, method: "DELETE", body });
      }
      const select = url.searchParams.get("select") || "*";
      let result = filtered.map((r) => this.join(table, r, select));
      const total = result.length;
      if (url.searchParams.has("limit"))
        result = result.slice(0, Number(url.searchParams.get("limit")));
      const single = request
        .headers()
        .accept?.includes("vnd.pgrst.object+json");
      return respond(single ? result[0] || null : result, 200, {
        "content-range": `0-${Math.max(0, total - 1)}/${total}`,
      });
    });
  }
}
export const test = base.extend<{ backend: Backend; browserErrors: string[] }>({
  backend: async ({ context }, provide) => {
    const backend = new Backend();
    await backend.install(context);
    await provide(backend);
  },
  browserErrors: [
    async ({ page, backend }, provide, info) => {
      const errors: string[] = [];
      const events: { kind: string; detail: string }[] = [];
      page.on("pageerror", (e) => {
        errors.push(e.message);
        events.push({ kind: "pageerror", detail: e.message });
      });
      page.on("console", (m) => {
        if (m.type() === "error") {
          events.push({ kind: "console-error", detail: m.text() });
          if (!m.text().includes("status of 4")) errors.push(m.text());
        }
      });
      page.on("response", (r) => {
        if (r.status() >= 400) {
          const path = new URL(r.url()).pathname;
          events.push({ kind: "http-error", detail: `${r.status()} ${path}` });
          const expected =
            backend.expectedHttp.some(
              (e) => path.endsWith(e.path) && r.status() === e.status,
            ) ||
            (path.includes("/auth/v1/token") && r.status() === 400) ||
            (path.endsWith("/lesson_progress") &&
              backend.deniedProgress &&
              r.status() === 403) ||
            (path.endsWith("/course_bookmarks") &&
              backend.deniedBookmarks &&
              r.status() === 403);
          if (!expected) errors.push(`Unexpected HTTP ${r.status()} ${path}`);
        }
      });
      page.on("requestfailed", (r) => {
        const detail = `${new URL(r.url()).pathname}: ${r.failure()?.errorText}`;
        events.push({ kind: "requestfailed", detail });
        if (!r.failure()?.errorText.includes("ERR_ABORTED"))
          errors.push(detail);
      });
      await provide(errors);
      await info.attach("browser-events", {
        body: JSON.stringify(events, null, 2),
        contentType: "application/json",
      });
      expect(errors, "Unexpected browser/runtime/network errors").toEqual([]);
    },
    { auto: true },
  ],
});
export async function login(page: Page, backend: Backend, role: Role) {
  await page.goto("/auth");
  await page.getByLabel("Email", { exact: true }).fill(users[role].email);
  await page.getByLabel("Password", { exact: true }).fill(backend.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole("heading", { name: `Welcome back, Test ${role}!` }),
  ).toBeVisible();
}
export { expect };
