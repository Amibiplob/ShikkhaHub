import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import StudentAnalytics from "@/components/StudentAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import CourseCard from "@/components/CourseCard";
import ProfileEditor from "@/components/ProfileEditor";
import LiveClassScheduler from "@/components/LiveClassScheduler";
import LiveClassModal from "@/components/LiveClassModal";
import ThumbnailUpload from "@/components/ThumbnailUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Bookmark, BookOpen, Calendar, GraduationCap, Loader2, Plus, Settings, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Dashboard = () => {
  const { user, loading: authLoading, hasRole, profile } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [studentLiveClasses, setStudentLiveClasses] = useState<any[]>([]);
  const [bookmarkedCourses, setBookmarkedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedLiveClass, setSelectedLiveClass] = useState<any>(null);

  // Create course form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Enrolled courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, courses(*, profiles!courses_teacher_id_profiles_fkey(full_name))")
        .eq("user_id", user.id);
      const courses = enrollments?.map((e) => e.courses).filter(Boolean) || [];
      setEnrolledCourses(courses);

      // Fetch progress for enrolled courses
      if (courses.length > 0) {
        const courseIds = courses.map((c: any) => c.id);
        const { data: allModules } = await supabase
          .from("modules")
          .select("id, course_id, lessons(id)")
          .in("course_id", courseIds);
        const { data: completedLessons } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("completed", true);
        const completedSet = new Set(completedLessons?.map((l) => l.lesson_id) || []);
        const progressMap: Record<string, number> = {};
        courseIds.forEach((cid: string) => {
          const mods = allModules?.filter((m) => m.course_id === cid) || [];
          const totalLessons = mods.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
          const completed = mods.reduce(
            (acc, m) => acc + (m.lessons?.filter((l: any) => completedSet.has(l.id)).length || 0), 0
          );
          progressMap[cid] = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
        });
        setCourseProgress(progressMap);
      }

      // Teacher courses
      if (hasRole("teacher")) {
        const [coursesRes, liveRes] = await Promise.all([
          supabase.from("courses").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
          supabase.from("live_classes").select("*, courses(title)").eq("teacher_id", user.id).order("scheduled_at", { ascending: true }),
        ]);
        setTeacherCourses(coursesRes.data || []);
        setLiveClasses(liveRes.data || []);
      }

      // Student live classes (from enrolled courses)
      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map((e) => e.course_id);
        const { data: studentLive } = await supabase
          .from("live_classes")
          .select("*, courses(title)")
          .in("course_id", courseIds)
          .not("status", "in", '("completed","expired")')
          .order("scheduled_at", { ascending: true });
        setStudentLiveClasses(studentLive || []);
      }

      // Bookmarked courses
      const { data: bookmarks } = await supabase
        .from("course_bookmarks")
        .select("course_id, courses(*, profiles!courses_teacher_id_profiles_fkey(full_name))")
        .eq("user_id", user.id);
      setBookmarkedCourses(bookmarks?.map((b) => b.courses).filter(Boolean) || []);

      setLoading(false);
    };
    fetchData();
  }, [user, hasRole]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase.from("courses").insert({
      teacher_id: user.id,
      title,
      description,
      category: category || null,
      difficulty: difficulty || null,
      is_published: true,
    }).select().single();

    if (error) toast.error(error.message);
    else {
      toast.success("Course created!");
      setTeacherCourses((prev) => [data, ...prev]);
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setDifficulty("");
    }
    setCreating(false);
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );

  const isTeacher = hasRole("teacher");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || "there"}!</h1>
            <p className="text-muted-foreground mt-1">
              {isTeacher ? "Manage your courses and track student progress" : "Continue learning where you left off"}
            </p>
          </div>
          <ProfileEditor onUpdated={() => window.location.reload()} />
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <BookOpen className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{enrolledCourses.length}</p>
            <p className="text-sm text-muted-foreground">Enrolled Courses</p>
          </div>
          {isTeacher && (
            <>
              <div className="rounded-xl border border-border bg-card p-5">
                <GraduationCap className="mb-2 h-5 w-5 text-accent" />
                <p className="text-2xl font-bold">{teacherCourses.length}</p>
                <p className="text-sm text-muted-foreground">Your Courses</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Users className="mb-2 h-5 w-5 text-success" />
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </>
          )}
        </div>

        <Tabs defaultValue={isTeacher ? "teaching" : "learning"}>
          <TabsList>
            {isTeacher && <TabsTrigger value="teaching">My Courses</TabsTrigger>}
            <TabsTrigger value="learning">Enrolled</TabsTrigger>
            <TabsTrigger value="live">
              <Video className="mr-1.5 h-3.5 w-3.5" /> Live Classes
            </TabsTrigger>
            <TabsTrigger value="bookmarks">
              <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Saved
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>

          {isTeacher && (
            <TabsContent value="teaching">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Courses</h2>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                      <Plus className="h-4 w-4" /> New Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCourse} className="space-y-4">
                      <div>
                        <Label>Title</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Category</Label>
                          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Web Development" />
                        </div>
                        <div>
                          <Label>Difficulty</Label>
                          <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={creating}>
                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Course
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {teacherCourses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">You haven't created any courses yet</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {teacherCourses.map((course) => (
                    <CourseCard key={course.id} {...course} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="learning">
            {enrolledCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">You're not enrolled in any courses yet</p>
                <Button variant="outline" onClick={() => navigate("/courses")}>Browse Courses</Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {enrolledCourses.map((course: any) => (
                  <CourseCard key={course.id} id={course.id} title={course.title} description={course.description} thumbnail_url={course.thumbnail_url} category={course.category} difficulty={course.difficulty} teacher_name={course.profiles?.full_name} progressPercent={courseProgress[course.id]} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="live">
            {isTeacher && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Live Classes</h2>
                <LiveClassScheduler
                  courses={teacherCourses.map((c) => ({ id: c.id, title: c.title }))}
                  onCreated={(lc) => setLiveClasses((prev) => [...prev, lc])}
                />
              </div>
            )}

            {/* Teacher's scheduled classes */}
            {isTeacher && liveClasses.length > 0 && (
              <div className="space-y-3 mb-6">
                {liveClasses.map((lc) => {
                  const isExpired = lc.status === "expired" || lc.status === "completed";
                  return (
                    <div key={lc.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{lc.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {lc.courses?.title} • {format(new Date(lc.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isExpired ? "destructive" : lc.status === "scheduled" ? "secondary" : "default"}>
                          {isExpired ? "expired" : lc.status}
                        </Badge>
                        {!isExpired && (
                          <Button size="sm" className="gap-1.5" onClick={() => setSelectedLiveClass(lc)}>
                            <Video className="h-3.5 w-3.5" /> Join
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Student live classes */}
            {!isTeacher && studentLiveClasses.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold mb-3">Live Classes</h2>
                {studentLiveClasses.map((lc) => {
                  const isExpired = lc.status === "expired" || lc.status === "completed";
                  return (
                    <div key={lc.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{lc.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {lc.courses?.title} • {format(new Date(lc.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      {isExpired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Button size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => setSelectedLiveClass(lc)}>
                          <Video className="h-3.5 w-3.5" /> Join
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty states */}
            {isTeacher && liveClasses.length === 0 && (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No live classes scheduled yet</p>
              </div>
            )}
            {!isTeacher && studentLiveClasses.length === 0 && (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No live classes available for your enrolled courses</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks">
            {bookmarkedCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">No bookmarked courses yet</p>
                <Button variant="outline" onClick={() => navigate("/courses")}>Browse Courses</Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {bookmarkedCourses.map((course: any) => (
                  <CourseCard key={course.id} id={course.id} title={course.title} description={course.description} thumbnail_url={course.thumbnail_url} category={course.category} difficulty={course.difficulty} teacher_name={course.profiles?.full_name} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <StudentAnalytics />
          </TabsContent>
        </Tabs>

        <LiveClassModal
          liveClass={selectedLiveClass}
          open={!!selectedLiveClass}
          onOpenChange={(open) => { if (!open) setSelectedLiveClass(null); }}
          onStatusChange={(id, status) => {
            setLiveClasses((prev) => prev.map((lc) => lc.id === id ? { ...lc, status } : lc));
            setStudentLiveClasses((prev) => prev.filter((lc) => lc.id !== id));
          }}
        />
      </main>
    </div>
  );
};

export default Dashboard;
