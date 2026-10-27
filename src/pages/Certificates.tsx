import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageShell from "@/components/PageShell";
import { downloadCertificate } from "@/lib/certificates";
import { toast } from "sonner";
export default function Certificates() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tables<"certificates">[]>([]),
    [courses, setCourses] = useState<{ id: string; title: string }[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const [c, e] = await Promise.all([
      supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false })
        .limit(200),
      supabase
        .from("enrollments")
        .select("courses(id,title)")
        .eq("user_id", user.id)
        .limit(200),
    ]);
    if (c.error || e.error) setError("Could not load your certificates.");
    else {
      setRows(c.data || []);
      setCourses((e.data || []).map((e) => e.courses).filter(Boolean));
    }
    setLoading(false);
  }, [user]);
  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);
  const issue = async (course: string) => {
    setBusy(course);
    const { error } = await supabase.rpc("issue_course_certificate", {
      target_course: course,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Certificate ready");
      await load();
    }
    setBusy("");
  };
  return (
    <PageShell
      title="My Certificates"
      description="Completion certificates are issued after every lesson is complete, every course quiz is passed and every assignment has a recorded grade. Your name and course title are preserved at issuance."
    >
      {error && (
        <p role="alert">
          {error} <Button onClick={load}>Retry</Button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading certificates…</p>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            {rows.map((c) => (
              <article
                key={c.id}
                className="space-y-3 rounded-xl border bg-card p-6"
              >
                <Badge variant="secondary">
                  {c.revoked_at
                    ? "Revoked"
                    : !c.course_id
                      ? "Course removed"
                      : !c.validated_at
                        ? "Needs eligibility check"
                        : "Issued"}
                </Badge>
                <h2 className="text-xl font-semibold">
                  {c.course_title || "Course certificate"}
                </h2>
                <p>{c.student_name}</p>
                <p className="break-all text-xs text-muted-foreground">
                  {c.certificate_number}
                </p>
                <p className="text-sm">
                  Issued {new Date(c.issued_at).toLocaleDateString()}
                </p>
                {c.revocation_reason && (
                  <p className="text-sm">{c.revocation_reason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!c.revoked_at && c.course_id && c.validated_at && (
                    <Button
                      disabled={!!busy}
                      onClick={async () => {
                        setBusy(c.id);
                        try {
                          await downloadCertificate(c.id);
                        } catch (e) {
                          toast.error((e as Error).message);
                        } finally {
                          setBusy("");
                        }
                      }}
                    >
                      Download PDF
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link to={`/certificates/verify/${c.verification_token}`}>
                      Verify certificate
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!rows.length && (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              No certificates yet. Complete your course activities to earn one.
            </div>
          )}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Check completed courses</h2>
            <p className="my-3 text-sm text-muted-foreground">
              Certificates are issued automatically when the final required
              activity is recorded. You can safely retry an eligibility check
              here.
            </p>
            <div className="space-y-3">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <Link
                    className="font-medium hover:text-primary"
                    to={`/courses/${c.id}`}
                  >
                    {c.title}
                  </Link>
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => issue(c.id)}
                  >
                    Check eligibility
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}
