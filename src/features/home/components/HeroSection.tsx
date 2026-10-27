import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Code2, Play, Users, Zap } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const { t } = useLanguage();
  const [counts, setCounts] = useState<{ courses: number; students: number; live: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (!active || error || !data) return;
      const d = data as { courses: number; students: number; live_classes: number };
      setCounts({ courses: d.courses ?? 0, students: d.students ?? 0, live: d.live_classes ?? 0 });
    })();
    return () => {
      active = false;
    };
  }, []);

  const fmt = (n: number | undefined) => (n === undefined ? "-" : n.toLocaleString());

  const stats = [
    { icon: Code2, label: t("hero.statCourses"), value: fmt(counts?.courses) },
    { icon: Users, label: t("hero.statStudents"), value: fmt(counts?.students) },
    { icon: Zap, label: t("hero.statLive"), value: fmt(counts?.live) },
  ];

  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-hero py-12 md:py-20">
      {/* Animated grid background */}
      <div className="hero-grid absolute inset-0 opacity-[0.05]" />

      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
          <div className="mb-6 inline-flex items-center gap-2 border border-primary/25 bg-primary/5 px-3 py-1.5 font-mono text-xs font-semibold uppercase text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {t("hero.badge")}
          </div>

          <h1 className="mb-6 max-w-3xl font-heading text-5xl font-bold leading-[1.02] text-foreground md:text-7xl">
            {t("hero.title1")}{" "}
            {t("hero.titleWith")} <span className="text-gradient-primary">{t("hero.titleExperts")}</span>
          </h1>

          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 px-8 h-12 text-base"><Link to="/auth?tab=signup">
                {t("hero.ctaPrimary")} <ArrowRight className="h-5 w-5" />
              </Link></Button>
            <Button asChild size="lg" variant="outline" className="gap-2 border-border/50 bg-card/5 backdrop-blur-sm h-12 text-base"><Link to="/courses">
                <Play className="h-5 w-5" /> {t("hero.ctaSecondary")}
              </Link></Button>
          </div>

          </div>

          <div className="space-y-4">
            <img src="/artwork/learning-workspace.svg" alt={t("hero.artworkAlt")} width={800} height={450} fetchPriority="high" className="w-full rounded-xl border border-border shadow-lg" />
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="group rounded-lg border border-border bg-card/80 p-4 shadow-xs backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                <div className="mb-3 flex h-9 w-11 items-center justify-center bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="font-heading text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 font-mono text-xs uppercase text-muted-foreground">{stat.label}</p>
              </div>
            ))}
            <Link to="/courses" className="group flex min-h-32 flex-col justify-between rounded-lg bg-primary p-6 text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90">
              <BookOpen className="h-6 w-6" />
              <div>
                <p className="font-heading text-xl font-bold">{t("hero.catalogTitle")}</p>
                <p className="mt-1 flex items-center gap-2 text-sm">{t("hero.catalogCta")} <ArrowRight className="h-4 w-4" /></p>
              </div>
            </Link>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
