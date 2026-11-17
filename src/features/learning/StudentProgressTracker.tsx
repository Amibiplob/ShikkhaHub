import { readAllRows } from '@/lib/read-all-rows';
import type { Tables } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

interface StudentProgressTrackerProps {
  courseId: string;
  isTeacher: boolean;
}

const StudentProgressTracker = ({ courseId, isTeacher }: StudentProgressTrackerProps) => {
  const [students, setStudents] = useState<(Pick<Tables<'profiles'>, 'user_id' | 'full_name' | 'avatar_url'> & { completedLessons: number; totalLessons: number; progressPercent: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isTeacher) return;

    let active = true;
    const controller = new AbortController();
    const fetchStudentProgress = async () => {
      // Get enrollments
      const { data: enrollments } = await readAllRows(supabase
        .from("enrollments")
        .select("user_id", { count: 'exact' })
        .eq("course_id", courseId), controller.signal);

      if (!enrollments || enrollments.length === 0) {
        if (active) { setStudents([]); setError(false); setLoading(false); }
        return;
      }

      const userIds = enrollments.map((e) => e.user_id);

      // Get profiles, modules/lessons, and lesson progress
      const [profilesRes, modulesRes] = await Promise.all([
        readAllRows(supabase.from("profiles").select("user_id, full_name, avatar_url", { count: 'exact' }).in("user_id", userIds), controller.signal),
        readAllRows(supabase.from("modules").select("id, course_id, lessons(id)", { count: 'exact' }).eq("course_id", courseId), controller.signal),
      ]);

      const allLessonIds = (modulesRes.data || []).flatMap((m) => m.lessons?.map((l) => l.id) || []);
      const totalLessons = allLessonIds.length;

      let progressData: Pick<Tables<'lesson_progress'>,'user_id'|'lesson_id'>[] = [];
      if (allLessonIds.length > 0) {
        const { data } = await readAllRows(supabase
          .from("lesson_progress")
          .select("user_id, lesson_id", { count: 'exact' })
          .in("lesson_id", allLessonIds)
          .in("user_id", userIds)
          .eq("completed", true), controller.signal);
        progressData = data || [];
      }

      // Build student list with progress
      const profiles = profilesRes.data || [];
      const studentList = profiles.map((p) => {
        const completed = progressData.filter((lp) => lp.user_id === p.user_id).length;
        const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
        return {
          ...p,
          completedLessons: completed,
          totalLessons,
          progressPercent: percent,
        };
      });

      // Sort by progress descending
      studentList.sort((a, b) => b.progressPercent - a.progressPercent);
      if (!active) return;
      setError(false);
      setStudents(studentList);
      setLoading(false);
    };

    void fetchStudentProgress().catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; controller.abort(); };
  }, [courseId, isTeacher, revision]);

  if (!isTeacher) return null;
  if (error) return <div role="alert">Could not load student progress. <button className="underline" onClick={() => setRevision(r => r + 1)}>Retry progress</button></div>;
  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto my-8" />;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" /> Student Progress ({students.length})
      </h3>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No students enrolled yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student) => {
            const initials = (student.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase();
            return (
              <div key={student.user_id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{student.full_name || "Student"}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {student.completedLessons}/{student.totalLessons} lessons
                      </span>
                      {student.progressPercent === 100 && (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs">Complete</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={student.progressPercent} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-primary w-8 text-right">{student.progressPercent}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentProgressTracker;
