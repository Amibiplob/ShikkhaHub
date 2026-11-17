import { readAllRows } from '@/lib/read-all-rows';
import { supabase } from "@/integrations/supabase/client";

// Guidance uses existing user-scoped tables. Only issue_course_certificate decides
// eligibility and persists completion; this summary never grants an entitlement.
export async function loadCompletion(courseId: string, userId: string) {
  const [quizzes, assignments, certificates, profile] = await Promise.all([
    readAllRows(supabase.from("quizzes").select("id, title", { count: 'exact' }).eq("course_id", courseId)),
    readAllRows(supabase.from("assignments").select("id, title, max_marks", { count: 'exact' }).eq("course_id", courseId)),
    supabase.from("certificates").select("*").eq("course_id", courseId).eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
  ]);
  for (const result of [quizzes, assignments, certificates, profile])
    if (result.error) throw result.error;
  const [attempts, submissions] = await Promise.all([
    quizzes.data?.length
      ? readAllRows(supabase.from("quiz_attempts").select("quiz_id, passed", { count: 'exact' }).eq("user_id", userId).in("quiz_id", quizzes.data.map(q => q.id)))
      : Promise.resolve({ data: [], error: null }),
    assignments.data?.length
      ? readAllRows(supabase.from("submissions").select("assignment_id, status, marks", { count: 'exact' }).eq("student_id", userId).in("assignment_id", assignments.data.map(a => a.id)))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (attempts.error) throw attempts.error;
  if (submissions.error) throw submissions.error;
  return {
    certificate: certificates.data,
    needsName: !profile.data?.full_name?.trim() || profile.data.full_name.trim().length > 200,
    quizzes: (quizzes.data || []).filter(q => !attempts.data?.some(a => a.quiz_id === q.id && a.passed)),
    assignments: (assignments.data || []).flatMap(a => {
      const submission = submissions.data?.find(s => s.assignment_id === a.id);
      if (submission && ["graded", "reviewed"].includes(submission.status) && submission.marks !== null && submission.marks >= 0 && a.max_marks !== null && submission.marks <= a.max_marks) return [];
      return [{ ...a, awaitingGrade: !!submission }];
    }),
  };
}
export type Completion = Awaited<ReturnType<typeof loadCompletion>>;
