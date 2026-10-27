import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";
import { browserTimezone, formatSession } from "@/features/tutoring/tutoring";
import { toast } from "sonner";
type Tutor = { user_id: string; full_name: string | null; bio: string | null };
export default function Tutors() {
  const { user, hasRole } = useAuth();
  const [slots, setSlots] = useState<Tables<"tutor_slots">[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [details, setDetails] = useState<Tables<"tutor_profiles">[]>([]);
  const [courses, setCourses] = useState<
    { id: string; title: string; teacher_id: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expertise, setExpertise] = useState("");
  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);
  const [slotId, setSlotId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [s, p] = await Promise.all([
      supabase
        .from("tutor_slots")
        .select("*")
        .is("cancelled_at", null)
        .eq("is_reserved", false)
        .gt("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(200),
      supabase.from("tutor_profiles").select("*").limit(200),
    ]);
    if (s.error || p.error) {
      setError("Could not load tutors. Please try again.");
      setLoading(false);
      return;
    }
    const ids = [...new Set((s.data || []).map((slot) => slot.teacher_id))];
    if (ids.length) {
      const [t, c] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,full_name,bio")
          .in("user_id", ids),
        supabase
          .from("courses")
          .select("id,title,teacher_id")
          .in("teacher_id", ids)
          .eq("is_published", true)
          .limit(200),
      ]);
      if (t.error || c.error)
        setError("Some tutor information could not be loaded.");
      setTutors(t.data || []);
      setCourses(c.data || []);
    } else {
      setTutors([]);
      setCourses([]);
    }
    setSlots(s.data || []);
    setDetails(p.data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);
  const request = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.rpc("request_tutoring", {
      target_slot: slotId,
      message: message.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Tutoring requested");
      setSlotId("");
      setSelectedTutor(null);
      setMessage("");
    }
    setBusy(false);
  };
  const visible = tutors.filter((t) => {
    const d = details.find((d) => d.user_id === t.user_id);
    return (
      `${t.full_name} ${d?.expertise || ""} ${slots
        .filter((s) => s.teacher_id === t.user_id)
        .map((s) => s.subject)
        .join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!expertise || d?.expertise === expertise)
    );
  });
  const tutor = tutors.find((t) => t.user_id === selectedTutor),
    detail = details.find((d) => d.user_id === selectedTutor);
  return (
    <PageShell
      title="Private Tutoring"
      description="Find a platform-approved teacher and request a one-on-one session. Sessions use teacher-provided meeting links. No payment is collected here."
    >
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <Label htmlFor="tutor-search">Search subject or teacher</Label>
          <Input
            id="tutor-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="expertise-filter">Expertise</Label>
          <select
            id="expertise-filter"
            className="block h-10 max-w-full rounded-md border bg-background px-3"
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
          >
            <option value="">All expertise</option>
            {[...new Set(details.map((d) => d.expertise).filter(Boolean))].map(
              (e) => (
                <option key={e}>{e}</option>
              ),
            )}
          </select>
        </div>
        {user && (
          <Button asChild variant="outline">
            <Link to="/dashboard?tab=tutoring">
              {hasRole("teacher")
                ? "Tutoring Management"
                : "My Tutoring Sessions"}
            </Link>
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-6 text-destructive">
          {error}{" "}
          <Button variant="outline" onClick={load}>
            Retry
          </Button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading tutors…</p>
      ) : !visible.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No matching availability yet. Try another search.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => {
            const d = details.find((d) => d.user_id === t.user_id);
            const first = slots.find((s) => s.teacher_id === t.user_id)!;
            return (
              <article
                key={t.user_id}
                className="flex flex-col rounded-xl border bg-card p-6"
              >
                <p className="text-xs uppercase tracking-wider text-primary">
                  Platform-approved teacher
                </p>
                <h2 className="mt-3 text-xl font-semibold">
                  {t.full_name || "Teacher"}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {d?.expertise ||
                    slots
                      .filter((s) => s.teacher_id === t.user_id)
                      .map((s) => s.subject)
                      .join(", ")}
                </p>
                <p className="my-4 text-sm">
                  Next availability:{" "}
                  {formatSession(first.starts_at, first.ends_at)}
                </p>
                <Button
                  className="mt-auto"
                  variant="outline"
                  onClick={() => {
                    setSelectedTutor(t.user_id);
                    setSlotId("");
                  }}
                >
                  View profile
                </Button>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        Availability shown in {browserTimezone()}. Qualifications are teacher
        supplied; platform role approval does not verify academic credentials.
        Showing up to 200 future slots.
      </p>
      <Dialog
        open={!!tutor}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTutor(null);
            setSlotId("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tutor?.full_name || "Tutor profile"}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {tutor?.bio || "No biography supplied."}
          </p>
          <div>
            <h3 className="font-semibold">Expertise</h3>
            <p>{detail?.expertise || "Not supplied"}</p>
          </div>
          <div>
            <h3 className="font-semibold">Qualifications (self-reported)</h3>
            <p className="whitespace-pre-wrap break-words">
              {detail?.qualifications || "Not supplied"}
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Offered courses</h3>
            <ul>
              {courses
                .filter((c) => c.teacher_id === selectedTutor)
                .map((c) => (
                  <li key={c.id}>
                    <Link
                      className="text-primary underline"
                      to={`/courses/${c.id}`}
                    >
                      {c.title}
                    </Link>
                  </li>
                ))}
            </ul>
            {!courses.some((c) => c.teacher_id === selectedTutor) && (
              <p>No published courses listed.</p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Available sessions</h3>
            {slots
              .filter((s) => s.teacher_id === selectedTutor)
              .map((s) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <p className="font-medium">{s.subject}</p>
                  <p className="text-sm">
                    {formatSession(s.starts_at, s.ends_at)} ·{" "}
                    {Math.round(
                      (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000,
                    )}{" "}
                    minutes
                  </p>
                  {!user ? (
                    <Link to="/auth" className="text-primary underline">
                      Sign in to request
                    </Link>
                  ) : (
                    selectedTutor !== user.id && (
                      <Button
                        className="mt-2"
                        variant="outline"
                        onClick={() => setSlotId(s.id)}
                      >
                        Request tutoring
                      </Button>
                    )
                  )}
                </div>
              ))}
          </div>
          {slotId && (
            <form onSubmit={request} className="space-y-3 border-t pt-4">
              <Label htmlFor="tutor-message">
                What would you like to learn?
              </Label>
              <Textarea
                id="tutor-message"
                required
                minLength={3}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button disabled={busy} type="submit">
                {busy ? "Sending…" : "Send request"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
