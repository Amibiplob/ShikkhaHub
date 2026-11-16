import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import { Button } from "@/components/ui/button";

type Task = { id: string; title: string; detail: string };
/** Only requests assignments in the signed-in learner's or teacher's courses. RLS remains authoritative. */
export default function AssessmentTasks({
  courseIds,
  teaching,
}: {
  courseIds: string[];
  teaching: boolean;
}) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const ids = courseIds.join(",");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !ids) {
        if (active) setTasks([]);
        return;
      }
      const assignments = await supabase
        .from("assignments")
        .select("id,title")
        .in("course_id", ids.split(","));
      if (assignments.error) throw assignments.error;
      if (!assignments.data?.length) {
        if (active) setTasks([]);
        return;
      }
      let query = supabase
        .from("submissions")
        .select("assignment_id,status,marks")
        .in(
          "assignment_id",
          assignments.data.map((a) => a.id),
        );
      if (!teaching) query = query.eq("student_id", user.id);
      const submissions = await query;
      if (submissions.error) throw submissions.error;
      if (!active) return;
      setTasks(
        assignments.data.flatMap((a) => {
          const rows = (submissions.data || []).filter(
            (s) => s.assignment_id === a.id,
          );
          const pending = rows.filter(
            (s) => !["graded", "reviewed"].includes(s.status),
          );
          if (teaching)
            return pending.length
              ? [{ ...a, detail: `${pending.length} awaiting review` }]
              : [];
          return rows.some(
            (s) =>
              ["graded", "reviewed"].includes(s.status) && s.marks !== null,
          )
            ? []
            : [
                {
                  ...a,
                  detail: rows.length
                    ? "Awaiting teacher grading"
                    : "Submission needed",
                },
              ];
        }),
      );
      setError(false);
    }
    void load().catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [ids, teaching, user, revision]);
  return (
    <section
      className="my-6 rounded-xl border bg-card p-5"
      aria-label={teaching ? "Pending grading" : "Pending assessments"}
    >
      <h2 className="text-xl font-semibold">
        {teaching ? "Pending grading" : "Pending assessments"}
      </h2>
      <p className="my-2 text-sm text-muted-foreground">
        {teaching
          ? "Open an assignment to review student submissions."
          : "Open an assignment to submit your work or check feedback. Quiz requirements are listed inside each course."}
      </p>
      {error ? (
        <p role="alert">
          Could not load assessments.{" "}
          <Button variant="outline" onClick={() => setRevision((r) => r + 1)}>
            Retry
          </Button>
        </p>
      ) : tasks === null ? (
        <p role="status">Loading assessments…</p>
      ) : tasks.length ? (
        <ul className="divide-y">
          {tasks.map((task) => (
            <li key={task.id} className="py-3">
              <Link
                className="font-medium text-primary underline underline-offset-4"
                to={`/assignments/${task.id}`}
              >
                {task.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {task.detail}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-sm">
          {teaching
            ? "No submissions awaiting review."
            : "No outstanding assignments in your courses."}
        </p>
      )}
    </section>
  );
}
