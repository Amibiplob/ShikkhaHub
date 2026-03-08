import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from "recharts";
import { Award, BookOpen, CheckCircle, Clock, Flame, Target, TrendingUp, Loader2 } from "lucide-react";

const StudentAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [enrollRes, progressRes, quizRes, badgeRes, certRes] = await Promise.all([
        supabase.from("enrollments").select("course_id, enrolled_at, courses(title, category, difficulty)").eq("user_id", user.id),
        supabase.from("lesson_progress").select("lesson_id, completed, completed_at").eq("user_id", user.id).eq("completed", true),
        supabase.from("quiz_attempts").select("quiz_id, score, total_points, passed, completed_at, quizzes(title, course_id)").eq("user_id", user.id),
        supabase.from("user_badges").select("badge_id, earned_at, badges(name, icon)").eq("user_id", user.id),
        supabase.from("certificates").select("id, course_id").eq("user_id", user.id),
      ]);

      // Get total lessons per enrolled course
      const courseIds = (enrollRes.data || []).map(e => e.course_id);
      let modulesData: any[] = [];
      if (courseIds.length > 0) {
        const { data: mods } = await supabase.from("modules").select("id, course_id, lessons(id)").in("course_id", courseIds);
        modulesData = mods || [];
      }

      setData({
        enrollments: enrollRes.data || [],
        progress: progressRes.data || [],
        quizAttempts: quizRes.data || [],
        badges: badgeRes.data || [],
        certificates: certRes.data || [],
        modules: modulesData,
      });
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  const { enrollments, progress, quizAttempts, badges, certificates, modules } = data;

  // Per-course progress
  const courseProgress = enrollments.map((e: any) => {
    const courseMods = modules.filter((m: any) => m.course_id === e.course_id);
    const totalLessons = courseMods.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
    const lessonIds = new Set(courseMods.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []));
    const completed = progress.filter((p: any) => lessonIds.has(p.lesson_id)).length;
    const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    return {
      name: e.courses?.title?.length > 18 ? e.courses.title.slice(0, 18) + "…" : (e.courses?.title || "Course"),
      progress: percent,
      completed,
      total: totalLessons,
    };
  });

  // Quiz performance
  const avgQuizScore = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((a: number, q: any) => a + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0) / quizAttempts.length)
    : 0;
  const quizPassRate = quizAttempts.length > 0
    ? Math.round((quizAttempts.filter((q: any) => q.passed).length / quizAttempts.length) * 100)
    : 0;

  // Learning streak (completed lessons by day, last 14 days)
  const today = new Date();
  const streakData = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (13 - i));
    const dayStr = date.toISOString().slice(0, 10);
    const count = progress.filter((p: any) => p.completed_at?.startsWith(dayStr)).length;
    return { day: date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }), lessons: count };
  });

  // Streak count
  let streak = 0;
  for (let i = streakData.length - 1; i >= 0; i--) {
    if (streakData[i].lessons > 0) streak++;
    else break;
  }

  // Skills radar (by category)
  const categories = [...new Set(enrollments.map((e: any) => e.courses?.category).filter(Boolean))];
  const radarData = categories.map((cat: string) => {
    const catCourses = enrollments.filter((e: any) => e.courses?.category === cat);
    const catProgress = catCourses.map((e: any) => {
      const cp = courseProgress.find((cp: any) => cp.name.startsWith(e.courses?.title?.slice(0, 18)));
      return cp?.progress || 0;
    });
    const avg = catProgress.length > 0 ? Math.round(catProgress.reduce((a: number, b: number) => a + b, 0) / catProgress.length) : 0;
    return { subject: cat, score: avg };
  });

  // Difficulty breakdown
  const diffData = ["beginner", "intermediate", "advanced"].map(d => ({
    name: d.charAt(0).toUpperCase() + d.slice(1),
    count: enrollments.filter((e: any) => e.courses?.difficulty === d).length,
  })).filter(d => d.count > 0);

  const totalCompleted = progress.length;
  const overallProgress = courseProgress.length > 0
    ? Math.round(courseProgress.reduce((a: number, c: any) => a + c.progress, 0) / courseProgress.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={BookOpen} label="Enrolled" value={enrollments.length} />
        <StatCard icon={CheckCircle} label="Lessons Done" value={totalCompleted} />
        <StatCard icon={Target} label="Avg Quiz Score" value={`${avgQuizScore}%`} />
        <StatCard icon={Award} label="Badges" value={badges.length} />
        <StatCard icon={Flame} label="Day Streak" value={streak} accent />
      </div>

      {/* Overall progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Overall Progress
          </h3>
          <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-3" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{certificates.length} certificate{certificates.length !== 1 ? "s" : ""} earned</span>
          <span>{quizPassRate}% quiz pass rate</span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Course progress bars */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Course Progress</h3>
          {courseProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Enroll in courses to track progress</p>
          ) : (
            <div className="space-y-4">
              {courseProgress.map((c: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate max-w-[200px]">{c.name}</span>
                    <span className="text-muted-foreground">{c.completed}/{c.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={c.progress} className="h-2 flex-1" />
                    <span className="text-xs font-semibold text-primary w-10 text-right">{c.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Learning activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Learning Activity (14 days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={streakData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={1} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="lessons" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Skills radar */}
        {radarData.length >= 3 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Skills Radar</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Quiz history */}
        {quizAttempts.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quiz Performance</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={quizAttempts.slice(-10).map((q: any, i: number) => ({
                name: q.quizzes?.title?.slice(0, 15) || `Quiz ${i + 1}`,
                score: q.total_points > 0 ? Math.round((q.score / q.total_points) * 100) : 0,
                passed: q.passed,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Difficulty breakdown */}
        {diffData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Course Difficulty</h3>
            <div className="flex items-end gap-6 justify-center h-[200px]">
              {diffData.map((d, i) => (
                <div key={d.name} className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{d.count}</span>
                  <div
                    className="rounded-lg w-16"
                    style={{
                      height: `${Math.max(40, (d.count / Math.max(...diffData.map(x => x.count))) * 140)}px`,
                      background: `hsl(var(--primary) / ${0.4 + i * 0.25})`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Badges earned */}
        {badges.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Badges Earned</h3>
            <div className="flex flex-wrap gap-3">
              {badges.map((b: any) => (
                <Badge key={b.badge_id} variant="secondary" className="px-3 py-1.5 text-sm gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  {b.badges?.name || "Badge"}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: boolean }) => (
  <div className={`rounded-xl border border-border bg-card p-5 ${accent ? "ring-2 ring-primary/20" : ""}`}>
    <Icon className={`mb-2 h-5 w-5 ${accent ? "text-amber-500" : "text-primary"}`} />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default StudentAnalytics;
