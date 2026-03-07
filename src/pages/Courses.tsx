import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

const categories = ["All", "Programming", "Web Development", "Data Science", "Mobile", "DevOps", "AI"];

const Courses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const fetchCourses = async () => {
      let query = supabase.from("courses").select("*, profiles!courses_teacher_id_fkey(full_name)").eq("is_published", true);
      if (category !== "All") query = query.eq("category", category);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data } = await query.order("created_at", { ascending: false });
      setCourses(data || []);
      setLoading(false);
    };
    fetchCourses();
  }, [search, category]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-border bg-gradient-hero py-12">
          <div className="container mx-auto px-4">
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Browse Courses</h1>
            <p className="text-muted-foreground">Find the perfect course to advance your skills</p>

            <div className="mt-6 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <Button
                  key={c}
                  variant={category === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(c)}
                  className={category === c ? "bg-gradient-primary text-primary-foreground" : ""}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">No courses found. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Courses;
