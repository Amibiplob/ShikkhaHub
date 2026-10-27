import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, Award, CalendarDays, Clock3, MessageSquare, PlayCircle, Radio, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ContinueCourse = {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  progress: number;
};

type LiveClassPreview = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string;
  room_name: string;
  courses: { title: string } | null;
};

type DiscussionPreview = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

const ContinueLearningContent = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<ContinueCourse[]>([]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const load = async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, courses(id, title, category, difficulty)")
        .eq("user_id", user.id)
        .limit(3);

      const enrolled = (enrollments || []).map((item) => item.courses).filter(Boolean);
      if (!active || enrolled.length === 0) return;

      const courseIds = enrolled.map((course) => course.id);
      const [{ data: modules }, { data: completed }] = await Promise.all([
        supabase.from("modules").select("course_id, lessons(id)").in("course_id", courseIds),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("completed", true),
      ]);
      const completedIds = new Set((completed || []).map((item) => item.lesson_id));

      const mapped = enrolled.map((course) => {
        const courseLessons = (modules || [])
          .filter((module) => module.course_id === course.id)
          .flatMap((module) => module.lessons || []);
        const finished = courseLessons.filter((lesson) => completedIds.has(lesson.id)).length;
        return {
          ...course,
          progress: courseLessons.length > 0 ? Math.round((finished / courseLessons.length) * 100) : 0,
        };
      });
      if (active) setCourses(mapped);
    };
    load();
    return () => { active = false; };
  }, [user]);

  if (!user || courses.length === 0) return null;

  return (
    <section className="border-t border-border py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary">{t("home.continue.eyebrow")}</p>
            <h2 className="font-heading text-3xl font-bold md:text-4xl">{t("home.continue.title")}</h2>
          </div>
          <Button asChild variant="ghost" className="hidden gap-2 sm:inline-flex">
            <Link to="/dashboard">{t("home.continue.all")} <ArrowRight /></Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="group border-l-2 border-primary bg-card p-6 transition-colors hover:bg-secondary/60">
              <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono uppercase">{course.category || t("home.course")}</span>
                <span>{course.progress}%</span>
              </div>
              <h3 className="mb-5 font-heading text-xl font-bold transition-colors group-hover:text-primary">{course.title}</h3>
              <Progress value={course.progress} className="h-1.5" />
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary"><PlayCircle className="h-4 w-4" /> {t("home.continue.resume")}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const LiveAndCommunitySection = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [liveClasses, setLiveClasses] = useState<LiveClassPreview[]>([]);
  const [posts, setPosts] = useState<DiscussionPreview[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [liveResult, postsResult] = await Promise.all([
        supabase
          .from("live_classes")
          .select("id, title, scheduled_at, duration_minutes, status, room_name, courses(title)")
          .not("status", "in", '("completed","expired")')
          .order("scheduled_at", { ascending: true })
          .limit(3),
        supabase
          .from("community_posts")
          .select("id, title, category, created_at")
          .eq("is_reported", false)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      if (!active) return;
      setLiveClasses((liveResult.data as LiveClassPreview[] | null) || []);
      setPosts(postsResult.data || []);
    };
    load();
    return () => { active = false; };
  }, []);

  return (
    <section id="live-learning" className="scroll-mt-24 border-y border-border bg-muted/25 py-12 md:py-16">
      <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary"><Radio className="h-3.5 w-3.5" /> {t("home.live.eyebrow")}</p>
              <h2 className="font-heading text-3xl font-bold md:text-4xl">{t("home.live.title")}</h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to={user ? "/dashboard?tab=live" : "/auth"}>{t("home.live.view")}</Link>
            </Button>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {liveClasses.length > 0 ? liveClasses.map((item, index) => (
              <div key={item.id} className="grid gap-4 py-5 sm:grid-cols-[5rem_1fr_auto] sm:items-center">
                <div className="font-mono text-sm text-primary">
                  <p className="text-2xl font-bold">{String(index + 1).padStart(2, "0")}</p>
                  <p className="text-xs uppercase text-muted-foreground">{item.status}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{item.courses?.title || t("home.course")}</p>
                  <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {format(new Date(item.scheduled_at), "MMM d, h:mm a")}</span>
                    <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {item.duration_minutes || 60} min</span>
                  </p>
                </div>
                <Button asChild size="sm" variant={item.status === "live" ? "default" : "outline"}>
                  <Link to={user ? `/live/${item.room_name}` : "/auth"}>{item.status === "live" ? t("home.live.join") : t("home.live.details")}</Link>
                </Button>
              </div>
            )) : (
              <div className="py-10 text-sm text-muted-foreground">{t("home.live.empty")}</div>
            )}
          </div>
        </div>

        <aside>
          <p className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-info"><MessageSquare className="h-3.5 w-3.5" /> {t("home.community.eyebrow")}</p>
          <h2 className="mb-7 font-heading text-3xl font-bold">{t("home.community.title")}</h2>
          <div className="divide-y divide-border border-y border-border">
            {posts.map((post, index) => (
              <Link key={post.id} to={`/community/${post.id}`} className="group grid grid-cols-[2rem_1fr] gap-3 py-4">
                <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="mb-1 block text-xs uppercase text-primary">{post.category}</span>
                  <span className="block font-heading font-semibold leading-snug transition-colors group-hover:text-primary">{post.title}</span>
                </span>
              </Link>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-6 w-full justify-between">
            <Link to="/community">{t("home.community.view")} <ArrowRight /></Link>
          </Button>
        </aside>
      </div>
    </section>
  );
};

const CredentialsSection = () => {
  const { t } = useLanguage();
  const benefits = useMemo(() => [
    { icon: Award, key: "certificate" },
    { icon: Trophy, key: "badges" },
    { icon: Star, key: "proof" },
  ], []);

  return (
    <section id="credentials" className="border-t border-border py-12 md:py-16">
      <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-primary">{t("home.credentials.eyebrow")}</p>
          <h2 className="font-heading text-3xl font-bold leading-tight md:text-5xl">{t("home.credentials.title")}</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">{t("home.credentials.subtitle")}</p>
          <Button asChild className="mt-7 gap-2">
            <Link to="/achievements">{t("home.credentials.cta")} <ArrowRight /></Link>
          </Button>
        </div>
        <div className="grid border-y border-border md:grid-cols-3 md:divide-x md:divide-border">
          {benefits.map((item, index) => (
            <div key={item.key} className="border-b border-border p-6 last:border-b-0 md:border-b-0">
              <span className="mb-8 flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><item.icon className="h-5 w-5" /></span>
              <p className="mb-2 font-mono text-xs text-muted-foreground">0{index + 1}</p>
              <h3 className="font-heading text-lg font-bold">{t(`home.credentials.${item.key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`home.credentials.${item.key}.text`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Reset user-scoped discovery state before rendering a different account.
const ContinueLearningSection = () => {
  const { user } = useAuth();
  return user ? <ContinueLearningContent key={user.id} /> : null;
};

const HomeDiscoverySections = {
  ContinueLearningSection,
  LiveAndCommunitySection,
  CredentialsSection,
};

export default HomeDiscoverySections;