import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import CourseCard from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

const Index = () => {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />

        {/* Featured Courses */}
        {featuredCourses.length > 0 && (
          <section className="py-20 md:py-28 border-t border-border">
            <div className="container mx-auto px-4">
              <div className="mb-12 flex items-end justify-between">
                <div>
                  <span className="mb-2 inline-block text-sm font-medium uppercase tracking-widest text-primary">
                    Popular
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                    Featured Courses
                  </h2>
                </div>
                <Link to="/courses">
                  <Button variant="outline" className="gap-2 hidden sm:flex">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
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
                <Link to="/courses">
                  <Button variant="outline" className="gap-2">
                    View All Courses <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        <FeaturesSection />

        {/* CTA Section */}
        <section className="border-t border-border py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
              Ready to start your{" "}
              <span className="text-gradient-primary">coding journey</span>?
            </h2>
            <p className="mx-auto mb-10 max-w-md text-lg text-muted-foreground">
              Join thousands of developers learning new skills every day.
            </p>
            <Link to="/auth?tab=signup">
              <Button
                size="lg"
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2 px-10 h-12 text-base shadow-glow"
              >
                Get Started Free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
