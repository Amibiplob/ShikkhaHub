import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CoursePrerequisitesProps {
  courseId: string;
  isTeacher: boolean;
}

const CoursePrerequisites = ({ courseId, isTeacher }: CoursePrerequisitesProps) => {
  const { user } = useAuth();
  const [prerequisites, setPrerequisites] = useState<any[]>([]);
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [courseId, user]);

  const fetchData = async () => {
    const { data: prereqs } = await supabase
      .from("course_prerequisites")
      .select("*, courses!course_prerequisites_prerequisite_course_id_fkey(id, title)")
      .eq("course_id", courseId);
    setPrerequisites(prereqs || []);

    if (isTeacher) {
      const { data: courses } = await supabase.from("courses").select("id, title").eq("teacher_id", user?.id || "").neq("id", courseId);
      setAllCourses(courses || []);
    }

    // Check which prerequisites user completed
    if (user && prereqs && prereqs.length > 0) {
      const prereqIds = prereqs.map((p) => p.prerequisite_course_id);
      const { data: enrollments } = await supabase
        .from("enrollments").select("course_id").eq("user_id", user.id).in("course_id", prereqIds);
      // Simple check: enrolled = "completed" (could be enhanced with actual progress check)
      const completed = new Set(enrollments?.map((e) => e.course_id) || []);
      setCompletedCourseIds(completed);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!selectedCourse) return;
    setAdding(true);
    const { data, error } = await supabase.from("course_prerequisites").insert({
      course_id: courseId,
      prerequisite_course_id: selectedCourse,
    }).select("*, courses!course_prerequisites_prerequisite_course_id_fkey(id, title)").single();
    if (error) toast.error(error.message);
    else {
      setPrerequisites((prev) => [...prev, data]);
      setSelectedCourse("");
      toast.success("Prerequisite added");
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    await supabase.from("course_prerequisites").delete().eq("id", id);
    setPrerequisites((prev) => prev.filter((p) => p.id !== id));
    toast.success("Prerequisite removed");
  };

  if (loading) return null;
  if (prerequisites.length === 0 && !isTeacher) return null;

  const allMet = prerequisites.every((p) => completedCourseIds.has(p.prerequisite_course_id));

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Link2 className="h-4 w-4" /> Prerequisites
      </h3>

      {prerequisites.length > 0 && (
        <div className="space-y-2 mb-3">
          {prerequisites.map((p) => {
            const met = completedCourseIds.has(p.prerequisite_course_id);
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                <Link to={`/courses/${p.prerequisite_course_id}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  {met ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
                  {p.courses?.title || "Unknown Course"}
                </Link>
                <div className="flex items-center gap-2">
                  {met ? (
                    <Badge className="bg-success/10 text-success border-success/20 text-xs">Completed</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                  {isTeacher && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!allMet && prerequisites.length > 0 && !isTeacher && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Complete all prerequisites before enrolling
        </div>
      )}

      {isTeacher && (
        <div className="flex items-center gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select prerequisite course" />
            </SelectTrigger>
            <SelectContent>
              {allCourses
                .filter((c) => !prerequisites.some((p) => p.prerequisite_course_id === c.id))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={adding || !selectedCourse}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CoursePrerequisites;
