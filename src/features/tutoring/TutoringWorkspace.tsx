import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import {
browserTimezone,
bookingLabel,
formatSession,
zonedInputToISO,
} from "@/features/tutoring/tutoring";
import { toast } from "sonner";
export default function TutoringWorkspace() {
  const { user, hasRole } = useAuth();
  const teacher = hasRole("teacher");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [slots, setSlots] = useState<Tables<"tutor_slots">[]>([]),
    [requests, setRequests] = useState<Tables<"tutoring_requests">[]>([]);
  const [profiles, setProfiles] = useState<
    { user_id: string; full_name: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const [subject, setSubject] = useState(""),
    [starts, setStarts] = useState(""),
    [duration, setDuration] = useState("60"),
    [zone, setZone] = useState(browserTimezone),
    [repeat, setRepeat] = useState("1"),
    [editing, setEditing] = useState<string | null>(null);
  const [expertise, setExpertise] = useState(""),
    [qualifications, setQualifications] = useState("");
  const [decision, setDecision] = useState<{
      id: string;
      action: string;
    } | null>(null),
    [meeting, setMeeting] = useState(""),
    [note, setNote] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const [owned, p] = await Promise.all([
      teacher
        ? supabase
            .from("tutor_slots")
            .select("*")
            .eq("teacher_id", user.id)
            .order("starts_at", { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [], error: null }),
      teacher
        ? supabase
            .from("tutor_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const ownedIds = (owned.data || []).map((s) => s.id);
    const [studentRequests, teacherRequests] = await Promise.all([
      supabase
        .from("tutoring_requests")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      ownedIds.length
        ? supabase
            .from("tutoring_requests")
            .select("*")
            .in("slot_id", ownedIds)
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const merged = [
      ...new Map(
        [...(studentRequests.data || []), ...(teacherRequests.data || [])].map(
          (r) => [r.id, r],
        ),
      ).values(),
    ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const needed = [...new Set(merged.map((r) => r.slot_id))];
    const related = needed.length
      ? await supabase.from("tutor_slots").select("*").in("id", needed)
      : { data: [], error: null };
    if (
      owned.error ||
      p.error ||
      studentRequests.error ||
      teacherRequests.error ||
      related.error
    )
      setError("Could not load tutoring. Try again.");
    else {
      const allSlots = [
        ...new Map(
          [...(owned.data || []), ...(related.data || [])].map((s) => [
            s.id,
            s,
          ]),
        ).values(),
      ].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
      setRequests(merged);
      setSlots(allSlots);
      if (p.data) {
        setExpertise(p.data.expertise);
        setQualifications(p.data.qualifications);
      }
      const ids = [
        ...new Set([
          ...merged.map((r) => r.student_id),
          ...allSlots.map((s) => s.teacher_id),
        ]),
      ];
      if (ids.length) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id,full_name")
          .in("user_id", ids);
        setProfiles(data || []);
      }
    }
    setLoading(false);
  }, [user, teacher]);
  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.rpc("save_tutor_slot", {
        slot_id: editing,
        subject,
        starts: zonedInputToISO(starts, zone),
        duration_minutes: Number(duration),
        zone,
        repeat_weeks: Number(repeat),
      });
      if (error) throw error;
      toast.success("Availability saved");
      setStarts("");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : (e as { message?: string }).message ||
              "Could not save availability",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!decision) return;
    setBusy(true);
    const { error } =
      decision.action === "remove"
        ? await supabase.rpc("cancel_tutor_slot", { target_slot: decision.id })
        : await supabase.rpc("decide_tutoring", {
            request_id: decision.id,
            action: decision.action,
            meeting_link: meeting || null,
            note: note || null,
          });
    if (error) toast.error(error.message);
    else {
      toast.success("Tutoring updated");
      setDecision(null);
      await load();
    }
    setBusy(false);
  };
  const choose = (id: string, action: string) => {
    setDecision({ id, action });
    setMeeting("");
    setNote("");
  };
  const ownedSlots = slots.filter(
    (s) => s.teacher_id === user?.id && !s.cancelled_at,
  );
  const visible = requests.filter(
    (r) => !status || bookingLabel(r.status) === status,
  );
  return (
    <section className="space-y-8" aria-labelledby="tutoring-workspace-heading">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 id="tutoring-workspace-heading" className="text-2xl font-bold">
            {teacher ? "Tutoring Management" : "My Tutoring Sessions"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Times shown in {browserTimezone()}. Confirmation reserves a slot; no
            payment is charged. Refresh to check for new decisions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            Refresh sessions
          </Button>
          <Button asChild variant="outline">
            <Link to="/tutors">Find a tutor</Link>
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error} <Button onClick={load}>Retry</Button>
        </p>
      )}
      {teacher && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={save}
            className="space-y-4 rounded-xl border bg-card p-5"
          >
            <h3 className="text-xl font-semibold">
              {editing ? "Edit availability" : "Offer availability"}
            </h3>
            <div>
              <Label htmlFor="tutor-subject">Subject</Label>
              <Input
                id="tutor-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                minLength={3}
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="slot-start">Starts (selected timezone)</Label>
              <Input
                id="slot-start"
                type="datetime-local"
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="slot-zone">Timezone (IANA)</Label>
              <Input
                id="slot-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Asia/Dhaka"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="slot-duration">Minutes</Label>
                <Input
                  id="slot-duration"
                  type="number"
                  min={15}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slot-repeat">Weekly occurrences</Label>
                <Input
                  id="slot-repeat"
                  type="number"
                  min={1}
                  max={editing ? 1 : 8}
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Repeat up to eight weeks at the same local time. Slots with
              request history cannot be moved.
            </p>
            <Button disabled={busy}>
              {busy
                ? "Saving…"
                : editing
                  ? "Save availability"
                  : "Add availability"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setStarts("");
                }}
              >
                Cancel edit
              </Button>
            )}
          </form>
          <div className="space-y-4">
            <form
              className="space-y-3 rounded-xl border bg-card p-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const { error } = await supabase.from("tutor_profiles").upsert({
                  user_id: user!.id,
                  expertise,
                  qualifications,
                  updated_at: new Date().toISOString(),
                });
                if (error) toast.error(error.message);
                else toast.success("Tutor profile saved");
                setBusy(false);
              }}
            >
              <h3 className="text-xl font-semibold">Tutor profile</h3>
              <div>
                <Label htmlFor="tutor-expertise">Expertise</Label>
                <Input
                  id="tutor-expertise"
                  maxLength={500}
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tutor-qualifications">
                  Qualifications (self-reported)
                </Label>
                <Textarea
                  id="tutor-qualifications"
                  maxLength={1500}
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                />
              </div>
              <Button disabled={busy} variant="outline">
                Save tutor profile
              </Button>
            </form>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 font-semibold">Your availability</h3>
              {!ownedSlots.length && (
                <p className="text-muted-foreground">No available slots.</p>
              )}
              <ul className="max-h-80 space-y-3 overflow-y-auto">
                {ownedSlots.map((s) => (
                  <li key={s.id} className="border-t pt-3">
                    <p className="font-medium">{s.subject}</p>
                    <p className="text-sm">
                      {formatSession(s.starts_at, s.ends_at)}
                    </p>
                    {Date.parse(s.starts_at) > now && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(s.id);
                            setSubject(s.subject);
                            setZone("UTC");
                            setStarts(
                              new Date(s.starts_at).toISOString().slice(0, 16),
                            );
                            setDuration(
                              String(
                                (Date.parse(s.ends_at) -
                                  Date.parse(s.starts_at)) /
                                  60000,
                              ),
                            );
                            setRepeat("1");
                          }}
                        >
                          Edit slot
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => choose(s.id, "remove")}
                        >
                          Remove slot
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="booking-filter">Session status</Label>
        <select
          id="booking-filter"
          className="ml-3 rounded-md border bg-background p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All sessions</option>
          {["pending", "confirmed", "completed", "cancelled", "rejected"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      {loading ? (
        <p role="status">Loading sessions…</p>
      ) : !visible.length ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No matching tutoring sessions.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((r) => {
            const s = slots.find((s) => s.id === r.slot_id);
            const owner = s?.teacher_id === user?.id;
            return (
              <article
                key={r.id}
                className="space-y-3 rounded-xl border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">
                    {s?.subject || "Tutoring session"}
                  </h3>
                  <Badge variant="secondary">{bookingLabel(r.status)}</Badge>
                </div>
                <p className="text-sm">
                  {s
                    ? formatSession(s.starts_at, s.ends_at)
                    : "Slot information unavailable"}
                </p>
                <p className="text-sm">
                  {owner ? "Student" : "Teacher"}:{" "}
                  {profiles.find(
                    (p) => p.user_id === (owner ? r.student_id : s?.teacher_id),
                  )?.full_name || "Participant"}
                </p>
                <p className="break-words text-sm">{r.message}</p>
                <p className="text-sm">Status: {bookingLabel(r.status)}</p>
                {r.decision_note && (
                  <p className="text-sm text-muted-foreground">
                    {r.decision_note}
                  </p>
                )}
                {r.status === "approved" && r.meeting_url && (
                  <a
                    href={r.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary underline"
                  >
                    Join tutoring meeting
                  </a>
                )}
                <div className="flex flex-wrap gap-2">
                  {owner && r.status === "pending" && (
                    <>
                      <Button onClick={() => choose(r.id, "approve")}>
                        Accept request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => choose(r.id, "reject")}
                      >
                        Decline request
                      </Button>
                    </>
                  )}
                  {["pending", "approved"].includes(r.status) &&
                    s &&
                    Date.parse(s.starts_at) > now && (
                      <Button
                        variant="outline"
                        onClick={() => choose(r.id, "cancel")}
                      >
                        Cancel session
                      </Button>
                    )}
                  {owner &&
                    r.status === "approved" &&
                    s &&
                    Date.parse(s.ends_at) <= now && (
                      <Button onClick={() => choose(r.id, "complete")}>
                        Record completion
                      </Button>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Showing the latest 200 requests. Completed means the teacher recorded
        completion after the scheduled end; it is not automated attendance
        verification.
      </p>
      <Dialog
        open={!!decision}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision?.action === "approve"
                ? "Confirm tutoring request"
                : "Confirm tutoring change"}
            </DialogTitle>
          </DialogHeader>
          <p>
            {decision?.action === "approve"
              ? "Only one request can be confirmed. Other requests for this slot will be declined."
              : "This change updates the booking history. Confirm the selected action."}
          </p>
          {decision?.action === "approve" && (
            <div>
              <Label htmlFor="meeting-link">HTTPS meeting link</Label>
              <Input
                id="meeting-link"
                type="url"
                value={meeting}
                onChange={(e) => setMeeting(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="decision-note">
              Note to participant (optional)
            </Label>
            <Textarea
              id="decision-note"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            disabled={
              busy ||
              (decision?.action === "approve" &&
                !/^https:\/\/[^\s]+$/i.test(meeting))
            }
            onClick={remove}
          >
            {busy ? "Updating…" : "Confirm change"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
