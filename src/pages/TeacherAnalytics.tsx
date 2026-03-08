import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { BookOpen, GraduationCap, Loader2, TrendingUp, Users, Award, ClipboardList } from "lucide-react";

const COLORS = ["hsl(152,60%,42%)", "hsl(262,60%,55%)", "hsl(38,92%,50%)", "hsl(210,100%,52%)", "hsl(0,72%,51%)"];

const TeacherAnalytics = () => {
  const { user, loading: authLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [lessonProgress, setLessonProgress] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole("teacher"))) navigate("/dashboard");
  }, [authLoading, user, hasRole, navigate]);

  useEffect(() => {
    if (!user || !hasRole("teacher")) return;
    const fetchData = async () => {
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", user.id);
      const courseList = coursesData || [];
      setCourses(courseList);

      if (courseList.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = courseList.map((c) => c.id);

      const [enrollRes, modulesRes, reviewsRes, assignRes] = await Promise.all([
        supabase.from("enrollments").select("*").in("course_id", courseIds),
        supabase.from("modules").select("id, course_id, lessons(id)").in("course_id", courseIds),
        supabase.from("course_reviews").select("*").in("course_id", courseIds),
        supabase.from("assignments").select("id").in("course_id", courseIds),
      ]);

      setEnrollments(enrollRes.data || []);
      setModules(modulesRes.data || []);
      setReviews(reviewsRes.data || []);

      // Get lesson progress for all lessons in teacher's courses
      const allLessonIds = (modulesRes.data || []).flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []);
      if (allLessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("*")
          .in("lesson_id", allLessonIds)
          .eq("completed", true);
        setLessonProgress(progressData || []);
      }

      // Get submissions for teacher's assignments
      if (assignRes.data && assignRes.data.length > 0) {
        const assignIds = assignRes.data.map((a) => a.id);
        const { data: subData } = await supabase
          .from("submissions")
          .select("*")
          .in("assignment_id", assignIds);
        setSubmissions(subData || []);
      }

      setLoading(false);
    };
    fetchData();
  }, [user, hasRole]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const totalStudents = new Set(enrollments.map((e) => e.user_id)).size;
  const totalEnrollments = enrollments.length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "—";
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter((s) => s.status === "reviewed").length;

  // Enrollments per course
  const enrollmentData = courses.map((c) => ({
    name: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title,
    students: enrollments.filter((e) => e.course_id === c.id).length,
  }));

  // Completion rates per course
  const completionData = courses.map((c) => {
    const courseMods = modules.filter((m) => m.course_id === c.id);
    const totalLessons = courseMods.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    const courseEnrollments = enrollments.filter((e) => e.course_id === c.id);
    if (totalLessons === 0 || courseEnrollments.length === 0) {
      return { name: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title, rate: 0 };
    }
    const allLessonIds = new Set(courseMods.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []));
    const completedPerStudent = courseEnrollments.map((e) => {
      const completed = lessonProgress.filter((lp) => allLessonIds.has(lp.lesson_id) && lp.user_id === e.user_id).length;
      return completed / totalLessons;
    });
    const avgRate = Math.round((completedPerStudent.reduce((a, b) => a + b, 0) / completedPerStudent.length) * 100);
    return { name: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title, rate: avgRate };
  });

  // Rating distribution
  const ratingDist = [1, 2, 3, 4, 5].map((r) => ({
    rating: `${r}★`,
    count: reviews.filter((rev) => rev.rating === r).length,
  }));

  // Difficulty distribution
  const diffDist = ["beginner", "intermediate", "advanced"].map((d) => ({
    name: d,
    value: courses.filter((c) => c.difficulty === d).length,
  })).filter((d) => d.value > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-primary" /> Teacher Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Track your courses, students, and engagement</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={BookOpen} label="Courses" value={courses.length} />
          <StatCard icon={Users} label="Unique Students" value={totalStudents} />
          <StatCard icon={GraduationCap} label="Total Enrollments" value={totalEnrollments} />
          <StatCard icon={Award} label="Avg Rating" value={avgRating} />
          <StatCard icon={ClipboardList} label="Submissions" value={`${gradedSubmissions}/${totalSubmissions}`} sub="graded / total" />
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Create courses to see analytics</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Enrollments per course */}
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Students per Course</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="students" fill="hsl(152,60%,42%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Completion rates */}
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Average Completion Rate (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="hsl(262,60%,55%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Rating distribution */}
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Rating Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,88%)" />
                  <XAxis dataKey="rating" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(38,92%,50%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Course difficulty distribution */}
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Course Difficulty Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={diffDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {diffDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: any; sub?: string }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <Icon className="mb-2 h-5 w-5 text-primary" />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-muted-foreground">{sub || label}</p>
  </div>
);

export default TeacherAnalytics;
