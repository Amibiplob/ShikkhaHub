// Intercepted service contracts for browser workflows, not hosted RLS proof.
// Database authorization is tested independently against complete SQL migrations.
import { mockOrigin } from "./target";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { certificateHandler } from "../supabase/functions/_shared/certificateHandler";
import { supportHandler } from "../supabase/functions/_shared/supportHandler";
import type { CertificateSnapshot } from "../supabase/functions/_shared/certificatePdf";
type Row = Record<string, unknown>;
interface State {
  rows: Record<string, Row[]>;
  mutations: { table: string; method: string; body: Row }[];
  userFrom: (headers: Record<string, string>) => string | null;
}
const admin = (b: State, uid: string | null) =>
  b.rows.user_roles.some((r) => r.user_id === uid && r.role === "admin");
const teacher = (b: State, uid: string | null) =>
  b.rows.user_roles.some((r) => r.user_id === uid && r.role === "teacher");
const fail = (message: string) => {
  throw new Error(message);
};
const row = (b: State, table: string, id: unknown) =>
  b.rows[table].find((r) => r.id === id) || fail("Record not found");
const stamp = (b: State, uid: string | null, action: string, target: unknown) =>
  b.rows.admin_audit_log.push({
    id: randomUUID(),
    actor_id: uid,
    action,
    target_id: target,
    created_at: new Date().toISOString(),
  });
function eligible(b: State, uid: string | null, id: unknown) {
  const course = b.rows.courses.find((c) => c.id === id && c.is_published);
  const modules = b.rows.modules
    .filter((m) => m.course_id === id)
    .map((m) => m.id);
  const lessons = b.rows.lessons.filter((l) => modules.includes(l.module_id));
  return (
    !!course &&
    b.rows.enrollments.some((e) => e.course_id === id && e.user_id === uid) &&
    lessons.length > 0 &&
    lessons.every((l) =>
      b.rows.lesson_progress.some(
        (p) => p.lesson_id === l.id && p.user_id === uid && p.completed,
      ),
    ) &&
    b.rows.quizzes
      .filter((q) => q.course_id === id)
      .every((q) =>
        b.rows.quiz_attempts.some(
          (a) => a.quiz_id === q.id && a.user_id === uid && a.passed,
        ),
      ) &&
    b.rows.assignments
      .filter((a) => a.course_id === id)
      .every((a) =>
        b.rows.submissions.some(
          (s) =>
            s.assignment_id === a.id &&
            s.student_id === uid &&
            ["graded", "reviewed"].includes(String(s.status)) &&
            typeof s.marks === "number",
        ),
      )
  );
}
export function phase3Rpc(
  b: State,
  fn: string,
  body: Row,
  uid: string | null,
): { handled: boolean; data?: unknown; error?: string } {
  const handled = [
    "admin_content_action",
    "admin_overview",
    "admin_records",
    "admin_set_role",
    "admin_course_action",
    "request_course_review",
    "admin_support_action",
    "admin_revoke_certificate",
    "issue_course_certificate",
    "verify_certificate",
    "save_tutor_slot",
    "cancel_tutor_slot",
    "request_tutoring",
    "decide_tutoring",
  ].includes(fn);
  if (!handled) return { handled: false };
  try {
    let result: unknown = null;
    if (fn.startsWith("admin_") && !admin(b, uid))
      fail("Administrator access required");
    if (fn === "admin_content_action") {
      const table =
        body.content_kind === "course" ? "courses" : "community_posts";
      const record = row(b, table, body.target_id);
      if (body.action === "delete")
        b.rows[table] = b.rows[table].filter((r) => r.id !== body.target_id);
      else record.is_pinned = body.action === "pin";
      stamp(b, uid, `${body.content_kind}.${body.action}`, body.target_id);
    }
    if (fn === "admin_overview")
      result = {
        users: b.rows.profiles.length,
        students: b.rows.user_roles.filter((r) => r.role === "student").length,
        teachers: b.rows.user_roles.filter((r) => r.role === "teacher").length,
        published_courses: b.rows.courses.filter((c) => c.is_published).length,
        pending_courses: b.rows.courses.filter(
          (c) => c.review_status === "pending",
        ).length,
        enrollments: b.rows.enrollments.length,
        tutoring_requests: b.rows.tutoring_requests.filter(
          (r) => r.status === "pending",
        ).length,
        upcoming_tutoring: b.rows.tutoring_requests.filter(
          (r) => r.status === "approved",
        ).length,
        completed_tutoring: b.rows.tutoring_requests.filter(
          (r) => r.status === "completed",
        ).length,
        open_support: b.rows.support_tickets.filter(
          (t) => t.status !== "resolved",
        ).length,
        certificates: b.rows.certificates.filter(
          (c) => c.validated_at && !c.revoked_at,
        ).length,
        revoked_certificates: b.rows.certificates.filter((c) => c.revoked_at)
          .length,
        learning_completions: b.rows.certificates.filter((c) => c.validated_at)
          .length,
        activity: [],
      };
    if (fn === "admin_records") {
      const kind = String(body.kind);
      let rows =
        kind === "users"
          ? b.rows.profiles.map((p) => ({
              ...p,
              roles: b.rows.user_roles
                .filter((r) => r.user_id === p.user_id)
                .map((r) => r.role),
              account_status: "Registered profile",
            }))
          : kind === "courses"
            ? b.rows.courses.map((c) => ({
                ...c,
                status: c.review_status || "draft",
                teacher: b.rows.profiles.find((p) => p.user_id === c.teacher_id)
                  ?.full_name,
              }))
            : kind === "support"
              ? b.rows.support_tickets
              : kind === "tutoring"
                ? b.rows.tutoring_requests.map((r) => ({
                    ...r,
                    ...Object.fromEntries(
                      Object.entries(
                        b.rows.tutor_slots.find((s) => s.id === r.slot_id) ||
                          {},
                      ).filter(([k]) => k !== "id"),
                    ),
                    student: b.rows.profiles.find(
                      (p) => p.user_id === r.student_id,
                    )?.full_name,
                  }))
                : kind === "certificates"
                  ? b.rows.certificates.map((c) => ({
                      ...c,
                      status: c.revoked_at
                        ? "revoked"
                        : c.validated_at
                          ? "valid"
                          : "pending_validation",
                      created_at: c.issued_at,
                    }))
                  : kind === "audit"
                    ? b.rows.admin_audit_log
                    : b.rows.community_posts;
      rows = rows.filter(
        (r) =>
          JSON.stringify(r)
            .toLowerCase()
            .includes(String(body.search || "").toLowerCase()) &&
          (!body.state ||
            (r as Row).status === body.state ||
            ((r as Row).roles as string[] | undefined)?.includes(
              String(body.state),
            )),
      );
      result = {
        rows: rows.slice(
          Number(body.page_offset || 0),
          Number(body.page_offset || 0) + Number(body.page_size || 10),
        ),
        total: rows.length,
      };
    }
    if (fn === "admin_set_role") {
      if (String(body.reason || "").trim().length < 3) fail("Reason required");
      if (
        !body.grant_role &&
        body.target_role === "admin" &&
        (body.target_user === uid ||
          b.rows.user_roles.filter((r) => r.role === "admin").length <= 1)
      )
        fail("Last or own admin cannot be removed");
      if (body.grant_role) {
        if (
          !b.rows.user_roles.some(
            (r) =>
              r.user_id === body.target_user && r.role === body.target_role,
          )
        )
          b.rows.user_roles.push({
            id: randomUUID(),
            user_id: body.target_user,
            role: body.target_role,
          });
      } else
        b.rows.user_roles = b.rows.user_roles.filter(
          (r) =>
            !(r.user_id === body.target_user && r.role === body.target_role),
        );
      stamp(b, uid, "role.review", body.target_user);
    }
    if (fn === "request_course_review") {
      const c = row(b, "courses", body.target_course);
      if (c.teacher_id !== uid) fail("Owned course not found");
      c.review_status = "pending";
      c.is_published = false;
    }
    if (fn === "admin_course_action") {
      const c = row(b, "courses", body.target_course);
      c.review_status =
        body.action === "approve"
          ? "approved"
          : body.action === "reject"
            ? "rejected"
            : "draft";
      c.is_published = body.action === "approve";
      stamp(b, uid, `course.${body.action}`, c.id);
    }
    if (fn === "save_tutor_slot") {
      if (!teacher(b, uid)) fail("Teacher access required");
      const starts = String(body.starts),
        end = new Date(
          Date.parse(starts) + Number(body.duration_minutes) * 60000,
        ).toISOString();
      const existing = body.slot_id
        ? row(b, "tutor_slots", body.slot_id)
        : null;
      if (existing?.teacher_id && existing.teacher_id !== uid)
        fail("Owned slot required");
      if (
        b.rows.tutor_slots.some(
          (s) =>
            s.teacher_id === uid &&
            s.id !== body.slot_id &&
            !s.cancelled_at &&
            Date.parse(String(s.starts_at)) < Date.parse(end) &&
            Date.parse(starts) < Date.parse(String(s.ends_at)),
        )
      )
        fail("Availability overlaps an existing slot");
      const added = [];
      for (let i = 0; i < Number(body.repeat_weeks || 1); i++) {
        const s = {
          id: existing?.id || randomUUID(),
          teacher_id: uid,
          subject: body.subject,
          starts_at: new Date(
            Date.parse(starts) + i * 7 * 86400000,
          ).toISOString(),
          ends_at: new Date(Date.parse(end) + i * 7 * 86400000).toISOString(),
          timezone: body.zone,
          cancelled_at: null,
          is_reserved: false,
          created_at: new Date().toISOString(),
        };
        if (existing) Object.assign(existing, s);
        else b.rows.tutor_slots.push(s);
        added.push(s);
      }
      result = added;
    }
    if (fn === "cancel_tutor_slot") {
      const s = row(b, "tutor_slots", body.target_slot);
      if (s.teacher_id !== uid) fail("Owned slot required");
      s.cancelled_at = new Date().toISOString();
    }
    if (fn === "request_tutoring") {
      const s = row(b, "tutor_slots", body.target_slot);
      if (
        !uid ||
        s.teacher_id === uid ||
        s.cancelled_at ||
        Date.parse(String(s.starts_at)) <= Date.now()
      )
        fail("Future available slot required");
      if (
        b.rows.tutoring_requests.some(
          (r) =>
            r.slot_id === s.id &&
            ["approved", "completed"].includes(String(r.status)),
        )
      )
        fail("This slot is already booked");
      if (
        b.rows.tutoring_requests.some(
          (r) => r.slot_id === s.id && r.student_id === uid,
        )
      )
        fail("You already requested this slot");
      const r = {
        id: randomUUID(),
        slot_id: s.id,
        student_id: uid,
        message: body.message,
        status: "pending",
        meeting_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      b.rows.tutoring_requests.push(r);
      result = r;
    }
    if (fn === "decide_tutoring") {
      const r = row(b, "tutoring_requests", body.request_id),
        s = row(b, "tutor_slots", r.slot_id);
      const owner = s.teacher_id === uid;
      if (!owner && r.student_id !== uid && !admin(b, uid))
        fail("Booking access required");
      if (body.action === "approve") {
        if (!owner || r.status !== "pending")
          fail("Only the teacher may confirm a pending request");
        if (!String(body.meeting_link || "").startsWith("https://"))
          fail("HTTPS meeting link required");
        if (
          b.rows.tutoring_requests.some(
            (other) =>
              other.id !== r.id &&
              other.status === "approved" &&
              (() => {
                const t = row(b, "tutor_slots", other.slot_id);
                return (
                  (t.teacher_id === s.teacher_id ||
                    other.student_id === r.student_id) &&
                  Date.parse(String(t.starts_at)) <
                    Date.parse(String(s.ends_at)) &&
                  Date.parse(String(s.starts_at)) <
                    Date.parse(String(t.ends_at))
                );
              })(),
          )
        )
          fail("Booking conflicts with a confirmed session");
        s.is_reserved = true;
        r.status = "approved";
        r.meeting_url = body.meeting_link;
        for (const other of b.rows.tutoring_requests)
          if (
            other.id !== r.id &&
            other.slot_id === s.id &&
            other.status === "pending"
          )
            other.status = "rejected";
      } else if (body.action === "reject") {
        if (!owner || r.status !== "pending") fail("Only teacher may decline");
        r.status = "rejected";
        r.meeting_url = null;
      } else if (body.action === "cancel") {
        if (
          !["pending", "approved"].includes(String(r.status)) ||
          Date.parse(String(s.starts_at)) <= Date.now()
        )
          fail("Only future sessions may be cancelled");
        s.is_reserved = false;
        r.status = "cancelled";
        r.meeting_url = null;
      } else if (body.action === "complete") {
        if (
          !owner ||
          r.status !== "approved" ||
          Date.parse(String(s.ends_at)) > Date.now()
        )
          fail("Only the teacher may record completion after the end");
        r.status = "completed";
        r.meeting_url = null;
      }
      r.decision_note = body.note;
      r.updated_at = new Date().toISOString();
      result = r;
      stamp(b, uid, `tutoring.${body.action}`, r.id);
    }
    if (fn === "issue_course_certificate") {
      if (!eligible(b, uid, body.target_course))
        fail(
          "Complete all lessons, pass every quiz and obtain grades for all assignments before requesting a certificate",
        );
      let c = b.rows.certificates.find(
        (c) => c.user_id === uid && c.course_id === body.target_course,
      );
      if (c?.revoked_at) fail("Certificate revoked");
      if (!c) {
        c = {
          id: randomUUID(),
          user_id: uid,
          course_id: body.target_course,
          student_name: b.rows.profiles.find((p) => p.user_id === uid)
            ?.full_name,
          course_title: row(b, "courses", body.target_course).title,
          certificate_number: `CERT-${randomUUID()}`,
          verification_token: randomUUID(),
          issued_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          revoked_at: null,
        };
        b.rows.certificates.push(c);
      }
      result = c;
    }
    if (fn === "verify_certificate") {
      const c = b.rows.certificates.find(
        (c) => c.verification_token === body.token,
      );
      result = c
        ? {
            certificate_number: c.certificate_number,
            course_title: c.course_title,
            issued_at: c.issued_at,
            status: c.revoked_at
              ? "revoked"
              : c.validated_at
                ? "valid"
                : "pending_validation",
          }
        : null;
    }
    if (fn === "admin_revoke_certificate") {
      const c = row(b, "certificates", body.certificate_id);
      c.revoked_at = new Date().toISOString();
      c.revocation_reason = body.reason;
      stamp(b, uid, "certificate.revoke", c.id);
    }
    if (fn === "admin_support_action") {
      const t = row(b, "support_tickets", body.ticket_id);
      t.status = body.next_status;
      t.updated_at = new Date().toISOString();
      if (body.internal_note)
        b.rows.support_notes.push({
          id: randomUUID(),
          ticket_id: t.id,
          author_id: uid,
          body: body.internal_note,
          created_at: new Date().toISOString(),
        });
      stamp(b, uid, "support.status", t.id);
    }
    b.mutations.push({ table: `rpc.${fn}`, method: "POST", body });
    return { handled: true, data: result };
  } catch (error) {
    return { handled: true, error: (error as Error).message };
  }
}
export async function phase3Service(b: State, request: Request) {
  if (request.url.includes("/support-contact")) {
    return supportHandler({
      secret: "isolated-browser-fixture-signing-material",
      origins: [mockOrigin],
      authenticate: async (authorization) => b.userFrom({ authorization }),
      intake: async (input) => {
        const existing = b.rows.support_tickets.find(
          (t) => t.intake_nonce === input.nonce,
        );
        if (existing) return String(existing.id);
        const t = {
          id: randomUUID(),
          user_id: input.owner_id,
          name: input.sender_name,
          email: input.sender_email,
          category: input.ticket_category,
          subject: input.ticket_subject,
          message: input.ticket_message,
          status: "open",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          intake_nonce: input.nonce,
          payload_hash: input.content_hash,
        };
        b.rows.support_tickets.push(t);
        return t.id;
      },
    })(request);
  }
  if (request.url.includes("/certificate-pdf"))
    return certificateHandler({
      origins: [mockOrigin],
      publicOrigin: mockOrigin,
      fonts: async () => ({
        latin: new Uint8Array(
          await readFile(
            "supabase/functions/_shared/fonts/NotoSans-Regular.ttf",
          ),
        ),
        bangla: new Uint8Array(
          await readFile(
            "supabase/functions/_shared/fonts/NotoSansBengali-Regular.ttf",
          ),
        ),
      }),
      readRecord: async (authorization, id) => {
        const uid = b.userFrom({ authorization });
        const c = b.rows.certificates.find(
          (c) =>
            c.id === id && c.user_id === uid && !c.revoked_at && c.validated_at,
        );
        return (c as unknown as CertificateSnapshot) || null;
      },
    })(request);
  return null;
}
