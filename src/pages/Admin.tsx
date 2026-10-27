import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import PageShell from "@/components/layout/PageShell";
import TeacherRequests from "@/features/administration/TeacherRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
type RecordRow = Record<string, Json | undefined>;
type PageData = { rows: RecordRow[]; total: number };
type Overview = Record<string, number | { date: string; changes: number }[]>;
const tabs = [
  "users",
  "courses",
  "tutoring",
  "certificates",
  "support",
  "community",
  "audit",
] as const;
const text = (row: RecordRow, key: string) =>
  typeof row[key] === "string" ? (row[key] as string) : "";
const labels: Record<string, string> = {
  users: "Total Users",
  students: "Students",
  teachers: "Teachers",
  published_courses: "Published Courses",
  pending_courses: "Pending Course Approvals",
  enrollments: "Enrollments",
  tutoring_requests: "Pending Tutoring Requests",
  upcoming_tutoring: "Upcoming Tutoring Sessions",
  completed_tutoring: "Completed Tutoring Sessions",
  open_support: "Unresolved Support Tickets",
  certificates: "Active Certificates",
  revoked_certificates: "Revoked Certificates",
  learning_completions: "Recorded Completions",
};
export default function Admin() {
  const { user } = useAuth();
  const [kind, setKind] = useState("users"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [state, setState] = useState(""),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null),
    [statsError, setStatsError] = useState(""),
    [data, setData] = useState<PageData>({ rows: [], total: 0 }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<{
      row: RecordRow;
      action: string;
      role?: "admin" | "teacher" | "student";
    } | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [supportStatus, setSupportStatus] = useState("open"),
    [notes, setNotes] = useState<
      { id: string; body: string; created_at: string }[]
    >([]);
  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => { setQuery(search); setPage(0); setLoading(true); }, 200);
    return () => clearTimeout(timer);
  }, [search, query]);
  const refresh = useCallback(() => { setLoading(true); setRevision((r) => r + 1); }, []);
  useEffect(() => {
    let active = true;
    supabase.rpc("admin_overview", {}).then(({ data, error }) => {
      if (active) {
        if (error) setStatsError("Could not load platform statistics.");
        else { setStatsError(""); setOverview(data as unknown as Overview); }
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    let active = true;
    supabase
      .rpc("admin_records", {
        kind,
        search: query,
        state,
        page_offset: page * 10,
        page_size: 10,
      })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("Could not load records. Please try again.");
        else { setError(""); setData(data as unknown as PageData); }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, query, state, page, revision]);
  const choose = async (
    row: RecordRow,
    action: string,
    role?: "admin" | "teacher" | "student",
  ) => {
    setSelected({ row, action, role });
    setReason("");
    setNotes([]);
    setSupportStatus(text(row, "status") || "open");
    if (action === "support") {
      const { data, error } = await supabase
        .from("support_notes")
        .select("id,body,created_at")
        .eq("ticket_id", text(row, "id"))
        .order("created_at");
      if (error) toast.error("Could not load internal notes");
      else setNotes(data || []);
    }
  };
  const act = async () => {
    if (!selected) return;
    setBusy(true);
    const { row, action, role } = selected;
    let error: { message: string } | null = null;
    try {
      if (action === "grant" || action === "revoke")
        ({ error } = await supabase.rpc("admin_set_role", {
          target_user: text(row, "user_id"),
          target_role: role!,
          grant_role: action === "grant",
          reason,
        }));
      else if (["approve", "reject", "unpublish"].includes(action))
        ({ error } = await supabase.rpc("admin_course_action", {
          target_course: text(row, "id"),
          action,
          reason,
        }));
      else if (action === "revoke_certificate")
        ({ error } = await supabase.rpc("admin_revoke_certificate", {
          certificate_id: text(row, "id"),
          reason,
        }));
      else if (action === "cancel_booking")
        ({ error } = await supabase.rpc("decide_tutoring", {
          request_id: text(row, "id"),
          action: "cancel",
          note: reason,
        }));
      else if (action === "support")
        ({ error } = await supabase.rpc("admin_support_action", {
          ticket_id: text(row, "id"),
          next_status: supportStatus,
          internal_note: reason || null,
        }));
      else if (action === "delete_course")
        ({ error } = await supabase.rpc("admin_content_action", {
          target_id: text(row, "id"),
          content_kind: "course",
          action: "delete",
          reason,
        }));
      else if (action === "delete_post")
        ({ error } = await supabase.rpc("admin_content_action", {
          target_id: text(row, "id"),
          content_kind: "post",
          action: "delete",
          reason,
        }));
      else if (action === "pin_post")
        ({ error } = await supabase.rpc("admin_content_action", {
          target_id: text(row, "id"),
          content_kind: "post",
          action: row.is_pinned ? "unpin" : "pin",
          reason,
        }));
      if (error) throw error;
      toast.success("Administrative change saved");
      setSelected(null);
      refresh();
    } catch (e) {
      toast.error(
        (e as { message?: string }).message ||
          "Unable to save administrative change",
      );
    } finally {
      setBusy(false);
    }
  };
  const roleActions = (row: RecordRow) => {
    const roles = Array.isArray(row.roles) ? row.roles : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(["teacher", "admin", "student"] as const).map((role) => (
          <Button
            key={role}
            size="sm"
            variant="outline"
            disabled={role === "admin" && text(row, "user_id") === user?.id}
            onClick={() =>
              choose(row, roles.includes(role) ? "revoke" : "grant", role)
            }
          >
            {roles.includes(role) ? "−" : "+"}{" "}
            {role[0].toUpperCase() + role.slice(1)}
          </Button>
        ))}
      </div>
    );
  };
  const filters =
    kind === "users"
      ? ["student", "teacher", "admin"]
      : kind === "courses"
        ? ["draft", "pending", "approved", "rejected"]
        : kind === "tutoring"
          ? ["pending", "approved", "completed", "cancelled", "rejected"]
          : kind === "certificates"
            ? ["valid", "revoked", "pending_validation", "course_removed"]
            : kind === "support"
              ? ["open", "in_progress", "resolved"]
              : [];
  const fields =
    kind === "users"
      ? ["full_name", "roles", "account_status"]
      : kind === "courses"
        ? ["title", "teacher", "status"]
        : kind === "tutoring"
          ? ["subject", "student", "teacher", "starts_at", "status"]
          : kind === "certificates"
            ? ["certificate_number", "student_name", "course_title", "status"]
            : kind === "support"
              ? ["subject", "name", "category", "status"]
              : kind === "audit"
                ? ["action", "actor_id", "target_id", "created_at"]
                : ["title", "is_reported", "is_pinned"];
  const activity = Array.isArray(overview?.activity) ? overview.activity : [];
  return (
    <PageShell
      title="Admin Panel"
      description="Review platform activity, manage access and respond to learners. Sensitive changes require confirmation and are checked by the backend."
    >
      {statsError ? (
        <p role="alert">
          {statsError} <Button onClick={refresh}>Retry statistics</Button>
        </p>
      ) : !overview ? (
        <p role="status">Loading platform statistics…</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Object.entries(labels).map(([key, label]) => (
              <article key={key} className="rounded-xl border bg-card p-4">
                <p className="text-2xl font-bold text-primary">
                  {typeof overview[key] === "number" ? overview[key] : 0}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{label}</p>
              </article>
            ))}
          </div>
          <details className="mb-8 rounded-xl border bg-card p-5">
            <summary className="cursor-pointer font-semibold">
              Administrative activity · last seven days
            </summary>
            <div
              className="mt-4 flex h-32 items-end gap-3"
              role="img"
              aria-label="Daily counts of recorded administrative changes"
            >
              {activity.map((a) => (
                <div
                  key={a.date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-xs">{a.changes}</span>
                  <div
                    className="w-full max-w-16 rounded-t bg-primary/70"
                    style={{
                      height: `${Math.max(3, (a.changes / Math.max(1, ...activity.map((d) => d.changes))) * 70)}px`,
                    }}
                  />
                  <span className="text-xs">{String(a.date).slice(5)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Role counts may overlap. Registered profiles are not a measurement
              of active sessions. Completion statistics count validated
              certificate records, including subsequent revocations.
            </p>
          </details>
        </>
      )}
      <TeacherRequests onReviewed={refresh} />
      <Tabs
        value={kind}
        onValueChange={(value) => {
          setLoading(true);
          setKind(value);
          setSearch("");
          setQuery("");
          setState("");
          setPage(0);
        }}
      >
        <TabsList className="mb-5">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Label htmlFor="admin-search">Search {kind}</Label>
                <Input
                  id="admin-search"
                  placeholder={
                    kind === "users"
                      ? "Search by name or ID..."
                      : kind === "courses"
                        ? "Search courses..."
                        : "Search records..."
                  }
                  value={search}
                  maxLength={200}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {!!filters.length && (
                <div>
                  <Label htmlFor="admin-filter">Filter</Label>
                  <select
                    id="admin-filter"
                    className="block h-10 w-full rounded-md border bg-background px-3 sm:w-auto"
                    value={state}
                    onChange={(e) => { setState(e.target.value); setPage(0); setLoading(true); }}
                  >
                    <option value="">All</option>
                    {filters.map((s) => (
                      <option key={s} value={s}>
                        {s === "approved" && kind === "tutoring"
                          ? "confirmed"
                          : s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button variant="outline" onClick={refresh}>
                Refresh records
              </Button>
            </div>
            {error ? (
              <p role="alert">
                {error} <Button onClick={refresh}>Retry</Button>
              </p>
            ) : loading ? (
              <p role="status">Loading records…</p>
            ) : !data.rows.length ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                No matching records.
              </div>
            ) : (
              <div className="rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fields.map((f) => (
                        <TableHead key={f}>{f.replace(/_/g, " ")}</TableHead>
                      ))}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={text(row, "id")}>
                        {fields.map((f) => (
                          <TableCell
                            key={f}
                            className="max-w-[250px] break-words"
                          >
                            {f === "roles" && Array.isArray(row.roles) ? (
                              <div className="flex flex-wrap gap-1">
                                {row.roles.map((r) => (
                                  <Badge key={String(r)} variant="secondary">
                                    {String(r)}
                                  </Badge>
                                ))}
                              </div>
                            ) : f === "status" ? (
                              <Badge variant="outline">
                                {text(row, f) === "approved" &&
                                kind === "tutoring"
                                  ? "confirmed"
                                  : text(row, f).replace("_", " ")}
                              </Badge>
                            ) : f.endsWith("_at") ? (
                              new Date(text(row, f)).toLocaleString()
                            ) : typeof row[f] === "boolean" ? (
                              row[f] ? (
                                "Yes"
                              ) : (
                                "No"
                              )
                            ) : (
                              text(row, f) || "-"
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex min-w-[150px] flex-wrap gap-2">
                            {kind === "users" && roleActions(row)}
                            {kind === "courses" && (
                              <>
                                <Button asChild size="sm" variant="outline">
                                  <Link to={`/courses/${text(row, "id")}`}>
                                    View course
                                  </Link>
                                </Button>
                                {row.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => choose(row, "approve")}
                                    >
                                      Approve course
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => choose(row, "reject")}
                                    >
                                      Reject course
                                    </Button>
                                  </>
                                )}
                                {row.is_published && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => choose(row, "unpublish")}
                                  >
                                    Unpublish
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => choose(row, "delete_course")}
                                >
                                  Delete course
                                </Button>
                              </>
                            )}
                            {kind === "tutoring" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => choose(row, "inspect")}
                                >
                                  View booking
                                </Button>
                                {["pending", "approved"].includes(
                                  text(row, "status"),
                                ) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      choose(row, "cancel_booking")
                                    }
                                  >
                                    Cancel booking
                                  </Button>
                                )}
                              </>
                            )}
                            {kind === "certificates" && (
                              <>
                                <Button asChild size="sm" variant="outline">
                                  <Link
                                    to={`/certificates/verify/${text(row, "verification_token")}`}
                                  >
                                    Verify
                                  </Link>
                                </Button>
                                {row.status !== "revoked" && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      choose(row, "revoke_certificate")
                                    }
                                  >
                                    Revoke certificate
                                  </Button>
                                )}
                              </>
                            )}
                            {kind === "support" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => choose(row, "support")}
                              >
                                Open ticket
                              </Button>
                            )}
                            {kind === "community" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => choose(row, "pin_post")}
                                >
                                  {row.is_pinned ? "Unpin" : "Pin"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => choose(row, "delete_post")}
                                >
                                  Delete post
                                </Button>
                              </>
                            )}
                            {kind === "audit" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => choose(row, "inspect")}
                              >
                                View event
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {data.total} records · Page {page + 1} of{" "}
                {Math.max(1, Math.ceil(data.total / 10))}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={loading || page === 0}
                  onClick={() => { setLoading(true); setPage((p) => p - 1); }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={loading || (page + 1) * 10 >= data.total}
                  onClick={() => { setLoading(true); setPage((p) => p + 1); }}
                >
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.action === "support"
                ? "Support ticket"
                : selected?.action === "inspect"
                  ? "Record details"
                  : "Confirm administrative action"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <dl className="space-y-2">
                {Object.entries(selected.row)
                  .filter(
                    ([k]) => !["payload_hash", "intake_nonce"].includes(k),
                  )
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="grid gap-1 border-b pb-2 sm:grid-cols-[140px_1fr]"
                    >
                      <dt className="text-sm text-muted-foreground">
                        {k.replace(/_/g, " ")}
                      </dt>
                      <dd className="whitespace-pre-wrap break-all text-sm">
                        {typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v ?? "-")}
                      </dd>
                    </div>
                  ))}
              </dl>
              {selected.action !== "inspect" && (
                <>
                  <p className="text-sm">
                    Action: {selected.action.replace(/_/g, " ")}{" "}
                    {selected.role || ""}. Confirm only after reviewing the
                    selected record.
                  </p>
                  {selected.action === "support" && (
                    <>
                      <div>
                        <Label htmlFor="support-status">Ticket status</Label>
                        <select
                          id="support-status"
                          className="ml-3 rounded-md border bg-background p-2"
                          value={supportStatus}
                          onChange={(e) => setSupportStatus(e.target.value)}
                        >
                          {["open", "in_progress", "resolved"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          Internal notes (administrators only)
                        </h3>
                        {notes.length ? (
                          notes.map((n) => (
                            <p
                              className="my-2 whitespace-pre-wrap text-sm"
                              key={n.id}
                            >
                              {n.body} ·{" "}
                              {new Date(n.created_at).toLocaleString()}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No internal notes.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="admin-reason">
                      {selected.action === "support"
                        ? "Internal note (optional)"
                        : "Reason for this change"}
                    </Label>
                    <Textarea
                      id="admin-reason"
                      maxLength={selected.action === "support" ? 2000 : 500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <Button
                    disabled={
                      busy ||
                      (selected.action !== "support" &&
                        reason.trim().length < 3)
                    }
                    onClick={act}
                  >
                    {busy ? "Saving…" : "Confirm action"}
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
