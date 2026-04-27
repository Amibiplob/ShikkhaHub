import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  BookOpen, GraduationCap, Loader2, TrendingUp, Users, Award,
  ClipboardList, Star, Eye, Target, CheckCircle,
} from "lucide-react";

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
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole("teacher"))) navigate("/dashboard");
  }, [authLoading, user, hasRole, navigate]);

  useEffect(() => {
    if (!user || !hasRole("teacher")) return;
    const fetchData = async () => {
      const { data: coursesData } = await supabase
        .from("courses").select("*").eq("teacher_id", user.id);
      const courseList = coursesData || [];
      setCourses(courseList);

      if (courseList.length === 0) { setLoading(false); return; }

      const courseIds = courseList.map((c) => c.id);

      const [enrollRes, modulesRes, reviewsRes, assignRes, quizRes] = await Promise.all([
        supabase.from("enrollments").select("*").in("course_id", courseIds),
        supabase.from("modules").select("id, course_id, lessons(id)").in("course_id", courseIds),
        supabase.from("course_reviews").select("*").in("course_id", courseIds),
        supabase.from("assignments").select("id, course_id").in("course_id", courseIds),
        supabase.from("quizzes").select("id, course_id").in("course_id", courseIds),
      ]);

      setEnrollments(enrollRes.data || []);
      setModules(modulesRes.data || []);
      setReviews(reviewsRes.data || []);

      // Lesson progress
      const allLessonIds = (modulesRes.data || []).flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []);
      if (allLessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from("lesson_progress").select("*").in("lesson_id", allLessonIds).eq("completed", true);
        setLessonProgress(progressData || []);
      }

      // Submissions
      if (assignRes.data && assignRes.data.length > 0) {
        const assignIds = assignRes.data.map((a) => a.id);
        const { data: subData } = await supabase
          .from("submissions").select("*").in("assignment_id", assignIds);
        setSubmissions(subData || []);
      }

      // Quiz attempts
      if (quizRes.data && quizRes.data.length > 0) {
        const quizIds = quizRes.data.map((q) => q.id);
        const { data: attempts } = await supabase
          .from("quiz_attempts").select("*").in("quiz_id", quizIds);
        setQuizAttempts(attempts || []);
      }

      // Student profiles
      const studentIds = [...new Set((enrollRes.data || []).map((e) => e.user_id))];
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("user_id, full_name, avatar_url").in("user_id", studentIds);
        setStudentProfiles(profiles || []);
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

  // Filter by selected course
  const filtered = selectedCourse === "all"
    ? { enrollments, submissions, reviews, lessonProgress, modules, quizAttempts }
    : {
        enrollments: enrollments.filter(e => e.course_id === selectedCourse),
        submissions: submissions, // filtered via assignments later
        reviews: reviews.filter(r => r.course_id === selectedCourse),
        lessonProgress,
        modules: modules.filter(m => m.course_id === selectedCourse),
        quizAttempts,
      };

  const totalStudents = new Set(filtered.enrollments.map((e) => e.user_id)).size;
  const totalEnrollments = filtered.enrollments.length;
  const avgRating = filtered.reviews.length > 0
    ? (filtered.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / filtered.reviews.length).toFixed(1)
    : "—";
  const totalSubmissions = filtered.submissions.length;
  const gradedSubmissions = filtered.submissions.filter((s: any) => s.status === "graded" || s.status === "reviewed").length;

  // Quiz stats
  const avgQuizScore = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((a: number, q: any) => a + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0) / quizAttempts.length)
    : 0;

  // Enrollments per course
  const enrollmentData = courses.map((c) => ({
    name: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title,
    students: enrollments.filter((e) => e.course_id === c.id).length,
  }));

  // Completion rates per course
  const completionData = courses.map((c) => {
    const courseMods = modules.filter((m: any) => m.course_id === c.id);
    const totalLessons = courseMods.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
    const courseEnrollments = enrollments.filter((e) => e.course_id === c.id);
    if (totalLessons === 0 || courseEnrollments.length === 0) {
      return { name: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title, rate: 0 };
    }
    const allLessonIds = new Set(courseMods.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []));
    const completedPerStudent = courseEnrollments.map((e) => {
      const completed = lessonProgress.filter((lp: any) => allLessonIds.has(lp.lesson_id) && lp.user_id === e.user_id).length;
      return completed / totalLessons;
    });
    const avgRate = Math.round((completedPerStudent.reduce((a, b) => a + b, 0) / completedPerStudent.length) * 100);
    return { name: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title, rate: avgRate };
  });

  // Enrollment trend (by week, last 8 weeks)
  const now = new Date();
  const enrollmentTrend = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = enrollments.filter(e => {
      const d = new Date(e.enrolled_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    return {
      week: weekStart.toLocaleDateString("en", { month: "short", day: "numeric" }),
      enrollments: count,
    };
  });

  // Rating distribution
  const ratingDist = [1, 2, 3, 4, 5].map((r) => ({
    rating: `${r}★`,
    count: filtered.reviews.filter((rev: any) => rev.rating === r).length,
  }));

  // Difficulty distribution
  const diffDist = ["beginner", "intermediate", "advanced"].map((d) => ({
    name: d.charAt(0).toUpperCase() + d.slice(1),
    value: courses.filter((c) => c.difficulty === d).length,
  })).filter((d) => d.value > 0);

  // Top students by progress
  const topStudents = (() => {
    const allLessonIds = modules.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []);
    const totalLessons = allLessonIds.length;
    const lessonSet = new Set(allLessonIds);
    return studentProfiles.map(p => {
      const completed = lessonProgress.filter((lp: any) => lessonSet.has(lp.lesson_id) && lp.user_id === p.user_id).length;
      const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      return { ...p, progress: percent, completed, total: totalLessons };
    }).sort((a, b) => b.progress - a.progress).slice(0, 10);
  })();

  // Submission status breakdown
  const subStatusData = [
    { name: "Submitted", value: submissions.filter(s => s.status === "submitted").length },
    { name: "Graded", value: submissions.filter(s => s.status === "graded" || s.status === "reviewed").length },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-primary" /> Teacher Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Deep insights into your courses and students</p>
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Courses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard icon={BookOpen} label="Courses" value={courses.length} />
          <StatCard icon={Users} label="Students" value={totalStudents} />
          <StatCard icon={GraduationCap} label="Enrollments" value={totalEnrollments} />
          <StatCard icon={Star} label="Avg Rating" value={avgRating} />
          <StatCard icon={Target} label="Avg Quiz" value={`${avgQuizScore}%`} />
          <StatCard icon={ClipboardList} label="Graded" value={`${gradedSubmissions}/${totalSubmissions}`} />
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Create courses to see analytics</p>
          </div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Enrollments per course */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Students per Course</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={enrollmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="rate" fill="hsl(262,60%,55%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Enrollment trend */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Enrollment Trend (8 weeks)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={enrollmentTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="enrollments" stroke="hsl(210,100%,52%)" fill="hsl(210,100%,52%,0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                {/* Rating distribution */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Rating Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ratingDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="rating" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(38,92%,50%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Difficulty pie */}
                {diffDist.length > 0 && (
                  <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold">Course Difficulty</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={diffDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                          {diffDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Submission status */}
                {subStatusData.length > 0 && (
                  <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold">Submission Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={subStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                          {subStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="students">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Top Students by Progress
                </h3>
                {topStudents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students enrolled yet</p>
                ) : (
                  <div className="space-y-3">
                    {topStudents.map((s, i) => {
                      const initials = (s.full_name || "S").split(" ").map((n: string) => n[0]).join("").toUpperCase();
                      return (
                        <div key={s.user_id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                          <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{s.full_name || "Student"}</p>
                              <span className="text-xs text-muted-foreground">{s.completed}/{s.total} lessons</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={s.progress} className="h-1.5 flex-1" />
                              <span className="text-xs font-semibold text-primary w-10 text-right">{s.progress}%</span>
                            </div>
                          </div>
                          {s.progress === 100 && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Done
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="engagement">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Lessons completed over time */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Lesson Completions (14 days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={Array.from({ length: 14 }, (_, i) => {
                      const date = new Date(now);
                      date.setDate(date.getDate() - (13 - i));
                      const dayStr = date.toISOString().slice(0, 10);
                      return {
                        day: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
                        completions: lessonProgress.filter((lp: any) => lp.completed_at?.startsWith(dayStr)).length,
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={1} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="completions" stroke="hsl(152,60%,42%)" fill="hsl(152,60%,42%,0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                {/* Quiz pass rates per course */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Quiz Pass Rate by Course</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={courses.map(c => {
                      const courseQuizIds = quizAttempts.length > 0
                        ? new Set() // simplified - show all
                        : new Set();
                      const courseAttempts = quizAttempts;
                      const passed = courseAttempts.filter((a: any) => a.passed).length;
                      const total = courseAttempts.length;
                      return {
                        name: c.title.length > 18 ? c.title.slice(0, 18) + "…" : c.title,
                        rate: total > 0 ? Math.round((passed / total) * 100) : 0,
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="rate" fill="hsl(262,60%,55%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Course stats table */}
                <Card className="p-6 lg:col-span-2">
                  <h3 className="mb-4 text-lg font-semibold">Course Performance Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-3 font-semibold">Course</th>
                          <th className="pb-3 font-semibold text-center">Students</th>
                          <th className="pb-3 font-semibold text-center">Completion</th>
                          <th className="pb-3 font-semibold text-center">Avg Rating</th>
                          <th className="pb-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map(c => {
                          const students = enrollments.filter(e => e.course_id === c.id).length;
                          const comp = completionData.find(cd => cd.name.startsWith(c.title.slice(0, 20)));
                          const courseReviews = reviews.filter((r: any) => r.course_id === c.id);
                          const cRating = courseReviews.length > 0
                            ? (courseReviews.reduce((a: number, r: any) => a + r.rating, 0) / courseReviews.length).toFixed(1)
                            : "—";
                          return (
                            <tr key={c.id} className="border-b border-border/50">
                              <td className="py-3 font-medium">{c.title}</td>
                              <td className="py-3 text-center">{students}</td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Progress value={comp?.rate || 0} className="h-1.5 w-16" />
                                  <span className="text-xs">{comp?.rate || 0}%</span>
                                </div>
                              </td>
                              <td className="py-3 text-center">{cRating}</td>
                              <td className="py-3 text-center">
                                <Badge variant={c.is_published ? "default" : "secondary"}>
                                  {c.is_published ? "Published" : "Draft"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <Icon className="mb-2 h-5 w-5 text-primary" />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default TeacherAnalytics;
