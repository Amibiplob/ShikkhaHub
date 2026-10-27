import type { Course } from "@/types/models";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CourseCard from "@/features/courses/components/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const categories = ["All", "Programming", "Web Development", "Data Science", "Mobile", "DevOps", "AI", "Design", "Computer Science", "Backend"];
const difficulties = ["All", "beginner", "intermediate", "advanced"];

const Courses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "All";
  const difficulty = searchParams.get("level") || "All";
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const instructor = searchParams.get("instructor") || "All";
  const [instructors, setInstructors] = useState<{id:string;name:string}[]>([]);
  const sort = searchParams.get("sort") || "newest";


  useEffect(() => {
    supabase.from("courses").select("teacher_id, profiles!courses_teacher_id_profiles_fkey(full_name)").eq("is_published",true).then(({data})=>{
      const unique = new Map((data || []).map(c=>[c.teacher_id,{id:c.teacher_id,name:c.profiles?.full_name||"Teacher"}]));
      setInstructors([...unique.values()]);
    });
  }, []);

  useEffect(() => {
    let active = true;
    const fetchCourses = async () => {
      setLoading(true);
      let query = supabase.from("courses").select("*, profiles!courses_teacher_id_profiles_fkey(full_name), enrollments(count)").eq("is_published", true);
      if (instructor !== "All") query = query.eq("teacher_id", instructor);
      if (category !== "All") query = query.eq("category", category);
      if (difficulty !== "All") query = query.eq("difficulty", difficulty);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data, error } = await query.order("created_at", { ascending: sort === "oldest" });
      if (!active) return;
      setError(!!error);
      const ordered = sort === "popular"
        ? [...(data || [])].sort((a, b) => (b.enrollments?.[0]?.count || 0) - (a.enrollments?.[0]?.count || 0))
        : (data || []);
      setCourses(ordered);
      setLoading(false);
    };
    fetchCourses();
    return () => { active = false; };
  }, [search, category, difficulty, sort, instructor, revision]);

  const updateFilters = (next: { search?: string; category?: string; level?: string; instructor?: string }) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "All") params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-border bg-gradient-hero py-12">
          <div className="container mx-auto px-4">
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Browse Courses</h1>
            <p className="text-muted-foreground">Find the perfect course to advance your skills</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search courses"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => {
                    updateFilters({ search: e.target.value });
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={instructor} onValueChange={value=>updateFilters({instructor:value})}>
                <SelectTrigger aria-label="Instructor" className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="All">All Instructors</SelectItem>{instructors.map(i=><SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={(value) => updateFilters({ level: value })}>
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
                  onClick={() => updateFilters({ category: c })}
                  className={category === c ? "bg-gradient-primary text-primary-foreground" : ""}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {error && <p role="alert" className="mb-6 text-destructive">Could not load courses. <Button variant="outline" onClick={()=>setRevision(r=>r+1)}>Retry</Button></p>}
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
