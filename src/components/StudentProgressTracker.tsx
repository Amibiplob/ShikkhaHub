import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

interface StudentProgressTrackerProps {
  courseId: string;
  isTeacher: boolean;
}

const StudentProgressTracker = ({ courseId, isTeacher }: StudentProgressTrackerProps) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTeacher) { setLoading(false); return; }

    const fetchStudentProgress = async () => {
      // Get enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", courseId);

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = enrollments.map((e) => e.user_id);

      // Get profiles, modules/lessons, and lesson progress
      const [profilesRes, modulesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        supabase.from("modules").select("id, course_id, lessons(id)").eq("course_id", courseId),
      ]);

      const allLessonIds = (modulesRes.data || []).flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []);
      const totalLessons = allLessonIds.length;

      let progressData: any[] = [];
      if (allLessonIds.length > 0) {
        const { data } = await supabase
          .from("lesson_progress")
          .select("user_id, lesson_id")
          .in("lesson_id", allLessonIds)
          .in("user_id", userIds)
          .eq("completed", true);
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
      setStudents(studentList);
      setLoading(false);
    };

    fetchStudentProgress();
  }, [courseId, isTeacher]);

  if (!isTeacher) return null;
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
