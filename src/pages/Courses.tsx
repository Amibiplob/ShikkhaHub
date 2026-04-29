import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";

const categories = ["All", "Programming", "Web Development", "Data Science", "Mobile", "DevOps", "AI"];
const difficulties = ["All", "beginner", "intermediate", "advanced"];

const Courses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      let query = supabase.from("courses").select("*, profiles!courses_teacher_id_profiles_fkey(full_name)").eq("is_published", true);
      if (category !== "All") query = query.eq("category", category);
      if (difficulty !== "All") query = query.eq("difficulty", difficulty);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data } = await query.order("created_at", { ascending: false });
      setCourses(data || []);
      setLoading(false);
    };
    fetchCourses();
  }, [search, category, difficulty]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-border py-12">
          <div className="container mx-auto px-4">
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Browse Courses</h1>
            <p className="text-muted-foreground">Find the perfect course to advance your skills</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-[160px]">
                  <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d === "All" ? "All Levels" : d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {!loading && courses.length > 0 && (
            <p className="mb-4 text-sm text-muted-foreground">{courses.length} course{courses.length !== 1 ? "s" : ""} found</p>
          )}
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
