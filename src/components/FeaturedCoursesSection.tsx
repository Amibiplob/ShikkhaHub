import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import type { Course } from "@/lib/models";
import { Button } from "@/components/ui/button";
import CourseCard from "@/components/CourseCard";
import { ArrowRight, Loader2 } from "lucide-react";

export default function FeaturedCoursesSection() {
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, profiles!courses_teacher_id_profiles_fkey(full_name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6);
      setFeaturedCourses(data || []);
      setLoadingCourses(false);
    };
    fetchFeatured();
  }, []);

  return <>
        {/* Featured Courses */}
        {featuredCourses.length > 0 && (
          <section className="border-t border-border bg-muted/20 py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <span className="mb-2 inline-block text-sm font-medium uppercase tracking-widest text-primary">{t("featured.eyebrow")}</span>
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("featured.title")}</h2>
                </div>
                <Button asChild variant="outline" className="gap-2 hidden sm:flex"><Link to="/courses">
                    {t("featured.viewAll")} <ArrowRight className="h-4 w-4" />
                  </Link></Button>
              </div>
              {loadingCourses ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      thumbnail_url={course.thumbnail_url}
                      category={course.category}
                      difficulty={course.difficulty}
                      teacher_name={course.profiles?.full_name}
                    />
                  ))}
                </div>
              )}
              <div className="mt-8 text-center sm:hidden">
                <Button asChild variant="outline" className="gap-2"><Link to="/courses">
                    {t("featured.viewAllCourses")} <ArrowRight className="h-4 w-4" />
                  </Link></Button>
              </div>
            </div>
          </section>
        )}

  </>;
}
