import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award } from "lucide-react";
import { downloadCertificate } from "./certificates";
import { loadCompletion, type Completion } from "./completion";

interface Props {
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  assessmentRevision?: number;
}
export default function CertificateCard({ courseId, completedLessons, totalLessons, assessmentRevision = 0 }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<Completion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void loadCompletion(courseId, user.id).then(result => {
      if (active) { setSummary(result); setError(""); }
    }).catch(() => { if (active) { setSummary(null); setError(t("completion.loadError")); } });
    return () => { active = false; };
  }, [courseId, user, completedLessons, assessmentRevision, revision, t]);

  const claim = async () => {
    if (!user || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("issue_course_certificate", { target_course: courseId });
      if (error) throw error;
      if (!data?.validated_at || data.revoked_at || data.user_id !== user.id || data.course_id !== courseId)
        throw new Error("Invalid completion response");
      // The returned durable certificate is the existing completion record.
      setSummary(s => s ? { ...s, certificate: data } : null);
      const current = await loadCompletion(courseId, user.id);
      setSummary(current);
    } catch {
      setError(t("completion.finishError"));
      // Refresh guidance even when an assessment changed in another session.
      try { setSummary(await loadCompletion(courseId, user.id)); } catch { /* Keep the visible error. */ }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const certificate = summary?.certificate;
  const downloadable = !!certificate?.validated_at && !certificate.revoked_at;
  const remaining = Math.max(0, totalLessons - completedLessons);
  const completed = downloadable && totalLessons > 0 && remaining === 0 &&
    !summary.needsName && summary.quizzes.length === 0 && summary.assignments.length === 0;
  return (
    <section aria-label={t("completion.title")} className="w-full min-w-0 space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="font-semibold">{t("completion.title")}</h2>
      <p>{completedLessons} / {totalLessons} {t("completion.lessons")}</p>
      <Progress aria-label={t("completion.lessons")} value={totalLessons ? completedLessons / totalLessons * 100 : 0} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!summary ? !error && <p role="status">{t("completion.loading")}</p> : <>
        {completed && <p role="status" className="font-medium text-success">{t("completion.completed")}</p>}
        {downloadable && !completed && <p role="status">{t("completion.previous")}</p>}
        {certificate?.revoked_at && <p role="alert">{t("completion.revoked")}</p>}
        <ul className="space-y-1 text-sm text-muted-foreground">
          {totalLessons === 0 && <li>{t("completion.noLessons")}</li>}
          {remaining > 0 && <li>{remaining} {t("completion.remaining")}</li>}
          {summary.needsName && <li><Link to="/profile" className="text-primary underline">{t("completion.name")}</Link></li>}
          {summary.quizzes.map(q => <li key={q.id}><a href="#course-quizzes" className="text-primary underline">{t("completion.quiz")}: {q.title}</a></li>)}
          {summary.assignments.map(a => <li key={a.id}><Link to={`/assignments/${a.id}`} className="text-primary underline">{t(a.awaitingGrade ? "completion.grading" : "completion.assignment")}: {a.title}</Link></li>)}
        </ul>
        <p className="text-sm text-muted-foreground">{t("completion.rules")}</p>
      </>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={claim} disabled={busy || !summary || !!certificate?.revoked_at}>
          <Award className="mr-2 h-4 w-4" />{t(busy ? "completion.checking" : "completion.finish")}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setRevision(r => r + 1)}>{t("completion.refresh")}</Button>
        {downloadable && <>
          <Button variant="outline" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await downloadCertificate(certificate.id); }
            catch { setError(t("completion.downloadError")); }
            finally { setBusy(false); }
          }}>{t("completion.download")}</Button>
          <Button asChild variant="ghost"><Link to={`/certificates/verify/${certificate.verification_token}`}>{t("completion.verify")}</Link></Button>
        </>}
      </div>
    </section>
  );
}
