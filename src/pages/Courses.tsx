import { useAuth } from "@/features/auth/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import type { Course } from "@/types/models";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CourseCard from "@/features/courses/components/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const difficulties = ["All", "beginner", "intermediate", "advanced"];

const Courses = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const bn = lang === "bn";
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [enrolled, setEnrolled] = useState<{
    userId: string;
    ids: string[];
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "All";
  const difficulty = searchParams.get("level") || "All";
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const instructor = searchParams.get("instructor") || "All";
  const [instructors, setInstructors] = useState<
    { id: string; name: string }[]
  >([]);
  const sort = searchParams.get("sort") || "newest";

  useEffect(() => {
    let active = true;
    void supabase
      .from("courses")
      .select(
        "teacher_id, category, profiles!courses_teacher_id_profiles_fkey(full_name)",
      )
      .eq("is_published", true)
      .then(({ data }) => {
        if (!active) return;
        const unique = new Map(
          (data || []).map((c) => [
            c.teacher_id,
            { id: c.teacher_id, name: c.profiles?.full_name || "Teacher" },
          ]),
        );
        setInstructors([...unique.values()]);
        setCategories(
          [
            "All",
            ...new Set(
              (data || [])
                .map((c) => c.category)
                .filter((c): c is string => !!c),
            ),
          ].sort((a, b) =>
            a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b),
          ),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (active && !error)
          setEnrolled({
            userId: user.id,
            ids: (data || []).map((e) => e.course_id),
          });
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    const fetchCourses = async () => {
      setLoading(true);
      let query = supabase
        .from("courses")
        .select("*, profiles!courses_teacher_id_profiles_fkey(full_name)")
        .eq("is_published", true);
      if (instructor !== "All") query = query.eq("teacher_id", instructor);
      if (category !== "All") query = query.eq("category", category);
      if (difficulty !== "All") query = query.eq("difficulty", difficulty);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data, error } = await query.order(
        sort === "title" ? "title" : "created_at",
        { ascending: sort === "oldest" || sort === "title" },
      );
      if (!active) return;
      setError(!!error);
      setCourses(data || []);
      setLoading(false);
    };
    const timer = setTimeout(() => void fetchCourses(), search ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, category, difficulty, sort, instructor, revision]);

  const updateFilters = (next: {
    search?: string;
    category?: string;
    level?: string;
    instructor?: string;
    sort?: string;
  }) => {
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
      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="border-b border-border bg-gradient-hero py-12">
          <div className="container mx-auto px-4">
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">
              {bn ? "কোর্স খুঁজুন" : "Browse Courses"}
            </h1>
            <p className="text-muted-foreground">
              Choose a subject, explore the lessons and start at your own pace
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:flex-1 sm:min-w-60">
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
              <Select
                value={instructor}
                onValueChange={(value) => updateFilters({ instructor: value })}
              >
                <SelectTrigger
                  aria-label="Instructor"
                  className="w-full sm:w-[180px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Instructors</SelectItem>
                  {instructors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={difficulty}
                onValueChange={(value) => updateFilters({ level: value })}
              >
                <SelectTrigger
                  aria-label="Difficulty"
                  className="w-full sm:w-[160px]"
                >
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

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                Sort by
                <select
                  aria-label="Sort courses"
                  value={sort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="rounded-md border border-input bg-background p-2"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="title">Course title</option>
                </select>
              </label>
              {searchParams.size > 0 && (
                <Button variant="ghost" onClick={() => setSearchParams({})}>
                  Clear filters
                </Button>
              )}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer py-2 font-medium">
                Categories · {category}
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Button
                    key={c}
                    variant={category === c ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters({ category: c })}
                    className={
                      category === c
                        ? "bg-gradient-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {error && (
            <p role="alert" className="mb-6 text-destructive">
              Could not load courses.{" "}
              <Button
                variant="outline"
                onClick={() => setRevision((r) => r + 1)}
              >
                Retry
              </Button>
            </p>
          )}
          {!loading && courses.length > 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              {courses.length} course{courses.length !== 1 ? "s" : ""} found
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-20">
              <p role="status">
                {bn ? "কোর্স লোড হচ্ছে…" : "Loading courses…"}
              </p>
            </div>
          ) : error ? null : courses.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                No courses match your search. Try a different keyword or clear
                the filters.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setSearchParams({})}
              >
                Show all courses
              </Button>
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
                  enrolled={
                    enrolled?.userId === user?.id &&
                    enrolled?.ids.includes(course.id)
                  }
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
