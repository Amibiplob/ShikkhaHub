import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { checkAndAwardBadges } from "@/hooks/useBadgeChecker";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Award, BookOpen, Brain, Download, Footprints, GraduationCap, HeartHandshake,
  Loader2, MessageCircle, Scroll, Star, Target, Trophy, Zap,
} from "lucide-react";
import { format } from "date-fns";

const iconMap: Record<string, any> = {
  footprints: Footprints,
  zap: Zap,
  brain: Brain,
  "graduation-cap": GraduationCap,
  scroll: Scroll,
  award: Award,
  "message-circle": MessageCircle,
  "heart-handshake": HeartHandshake,
  star: Star,
  target: Target,
};

const Achievements = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [earnedMap, setEarnedMap] = useState<Record<string, string>>({});
  const [certificates, setCertificates] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Check & award any new badges
      await checkAndAwardBadges(user.id);

      const [badgesRes, earnedRes, certRes, enrollRes] = await Promise.all([
        supabase.from("badges").select("*").order("criteria_value"),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
        supabase.from("certificates").select("*, courses(title, category, difficulty)").eq("user_id", user.id).order("issued_at", { ascending: false }),
        supabase.from("enrollments").select("course_id, courses(*, profiles!courses_teacher_id_profiles_fkey(full_name))").eq("user_id", user.id),
      ]);

      setAllBadges(badgesRes.data || []);
      const eSet = new Set<string>();
      const eMap: Record<string, string> = {};
      earnedRes.data?.forEach((e) => { eSet.add(e.badge_id); eMap[e.badge_id] = e.earned_at; });
      setEarnedBadgeIds(eSet);
      setEarnedMap(eMap);
      setCertificates(certRes.data || []);

      const courses = enrollRes.data?.map((e) => e.courses).filter(Boolean) || [];
      setEnrolledCourses(courses);

      if (courses.length > 0) {
        const courseIds = courses.map((c: any) => c.id);
        const { data: allModules } = await supabase
          .from("modules").select("id, course_id, lessons(id)").in("course_id", courseIds);
        const { data: completedLessons } = await supabase
          .from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("completed", true);
        const completedSet = new Set(completedLessons?.map((l) => l.lesson_id) || []);
        const progressMap: Record<string, number> = {};
        courseIds.forEach((cid: string) => {
          const mods = allModules?.filter((m) => m.course_id === cid) || [];
          const total = mods.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
          const done = mods.reduce((acc, m) => acc + (m.lessons?.filter((l: any) => completedSet.has(l.id)).length || 0), 0);
          progressMap[cid] = total > 0 ? Math.round((done / total) * 100) : 0;
        });
        setCourseProgress(progressMap);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const completedCourses = enrolledCourses.filter((c: any) => courseProgress[c.id] === 100);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-7 w-7 text-primary" /> My Achievements
          </h1>
          <p className="text-muted-foreground mt-1">Track your learning journey, badges, and certificates</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <BookOpen className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{enrolledCourses.length}</p>
            <p className="text-sm text-muted-foreground">Enrolled</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <Trophy className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{completedCourses.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <Award className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{certificates.length}</p>
            <p className="text-sm text-muted-foreground">Certificates</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <Star className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{earnedBadgeIds.size}/{allBadges.length}</p>
            <p className="text-sm text-muted-foreground">Badges</p>
          </div>
        </div>

        {/* Badges */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Badges
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allBadges.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              const IconComp = iconMap[badge.icon] || Award;
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-5 transition-colors ${
                    earned
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2.5 ${earned ? "bg-primary/10" : "bg-muted"}`}>
                      <IconComp className={`h-5 w-5 ${earned ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{badge.name}</h3>
                        {earned && <Badge className="bg-success/10 text-success border-success/20 text-xs">Earned</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{badge.description}</p>
                      {earned && earnedMap[badge.id] && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(earnedMap[badge.id]), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Certificates */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Certificates ({certificates.length})
          </h2>
          {certificates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <Award className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Complete a course to earn your first certificate!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <div key={cert.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-xs">{cert.certificate_number}</Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{cert.courses?.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Earned on {format(new Date(cert.issued_at), "MMMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Course Progress */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Course Progress
          </h2>
          {enrolledCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">You haven't enrolled in any courses yet</p>
              <Button variant="outline" onClick={() => navigate("/courses")}>Browse Courses</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {enrolledCourses.map((course: any) => {
                const progress = courseProgress[course.id] || 0;
                return (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{course.title}</h3>
                          {progress === 100 && <Badge className="bg-success/10 text-success border-success/20 text-xs">Complete</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {course.profiles?.full_name && `by ${course.profiles.full_name}`}
                          {course.category && ` • ${course.category}`}
                        </p>
                        <div className="flex items-center gap-3">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-primary whitespace-nowrap">{progress}%</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Achievements;
