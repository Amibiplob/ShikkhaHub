import { useEffect, useState } from "react";
import { checkAndAwardBadges } from "@/hooks/useBadgeChecker";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseReviews from "@/components/CourseReviews";
import CertificateCard from "@/components/CertificateCard";
import CourseContentEditor from "@/components/CourseContentEditor";
import CourseDiscussions from "@/components/CourseDiscussions";
import StudentProgressTracker from "@/components/StudentProgressTracker";
import QuizManager from "@/components/QuizManager";
import BookmarkButton from "@/components/BookmarkButton";
import CoursePrerequisites from "@/components/CoursePrerequisites";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bookmark, BookOpen, CheckCircle2, ClipboardList, Eye, EyeOff, FileText, Loader2, PlayCircle, Plus, Video, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [createAssignOpen, setCreateAssignOpen] = useState(false);
  const [creatingAssign, setCreatingAssign] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [assignMarks, setAssignMarks] = useState("100");

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [courseRes, modulesRes, assignRes, liveRes] = await Promise.all([
        supabase.from("courses").select("*, profiles!courses_teacher_id_profiles_fkey(full_name)").eq("id", id).single(),
        supabase.from("modules").select("*, lessons(*)").eq("course_id", id).order("sort_order"),
        supabase.from("assignments").select("*").eq("course_id", id).order("created_at", { ascending: false }),
        supabase.from("live_classes").select("*").eq("course_id", id).neq("status", "completed").order("scheduled_at", { ascending: true }),
      ]);
      setCourse(courseRes.data);
      setAssignments(assignRes.data || []);
      const mods = modulesRes.data || [];
      mods.forEach((m: any) => m.lessons?.sort((a: any, b: any) => a.sort_order - b.sort_order));
      setModules(mods);

      if (user) {
        const { data: enrollment } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", id).maybeSingle();
        setEnrolled(!!enrollment);

        const allLessonIds = mods.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []);
        if (allLessonIds.length > 0) {
          const { data: prog } = await supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", user.id).in("lesson_id", allLessonIds);
          const map: Record<string, boolean> = {};
          prog?.forEach((p) => { if (p.completed) map[p.lesson_id] = true; });
          setProgress(map);
        }
      }

      // Auto-select first lesson
      if (mods.length > 0 && mods[0].lessons?.length > 0) {
        setActiveLesson(mods[0].lessons[0]);
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) return navigate("/auth");
    setEnrolling(true);
    const { error } = await supabase.from("enrollments").insert({ user_id: user.id, course_id: id! });
    if (error) toast.error("Failed to enroll");
    else { setEnrolled(true); toast.success("Enrolled successfully!"); checkAndAwardBadges(user.id); }
    setEnrolling(false);
  };

  const toggleComplete = async (lessonId: string) => {
    if (!user) return;
    const isCompleted = progress[lessonId];
    if (isCompleted) {
      await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
      setProgress((p) => { const n = { ...p }; delete n[lessonId]; return n; });
    } else {
      await supabase.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() });
      setProgress((p) => ({ ...p, [lessonId]: true }));
      checkAndAwardBadges(user.id);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setCreatingAssign(true);
    const { data, error } = await supabase.from("assignments").insert({
      course_id: id,
      teacher_id: user.id,
      title: assignTitle,
      description: assignDesc || null,
      due_date: assignDue ? new Date(assignDue).toISOString() : null,
      max_marks: parseInt(assignMarks) || 100,
    }).select().single();
    if (error) toast.error(error.message);
    else {
      toast.success("Assignment created!");
      setAssignments((prev) => [data, ...prev]);
      setCreateAssignOpen(false);
      setAssignTitle("");
      setAssignDesc("");
      setAssignDue("");
      setAssignMarks("100");
    }
    setCreatingAssign(false);
  };

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedCount = Object.keys(progress).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );

  if (!course) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><p>Course not found</p></div></div>
  );

  const lessonIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4 text-info" />;
      case "article": return <FileText className="h-4 w-4 text-primary" />;
      case "file": return <Download className="h-4 w-4 text-warning" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-border bg-gradient-hero py-10">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {course.category && <Badge variant="outline" className="text-primary border-primary/30">{course.category}</Badge>}
              {course.difficulty && <Badge variant="outline">{course.difficulty}</Badge>}
              {course.teacher_id === user?.id && (
                <Badge variant={course.is_published ? "default" : "secondary"}>
                  {course.is_published ? "Published" : "Draft"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <h1 className="mb-2 text-3xl font-bold md:text-4xl">{course.title}</h1>
              <BookmarkButton courseId={id!} />
            </div>
            {course.description && <p className="max-w-2xl text-muted-foreground">{course.description}</p>}
            <p className="mt-3 text-sm text-muted-foreground">by {course.profiles?.full_name || "Unknown"}</p>

            {/* Publish toggle for teacher */}
            {course.teacher_id === user?.id && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={async () => {
                  const newVal = !course.is_published;
                  const { error } = await supabase.from("courses").update({ is_published: newVal }).eq("id", id);
                  if (error) toast.error(error.message);
                  else {
                    setCourse({ ...course, is_published: newVal });
                    toast.success(newVal ? "Course published!" : "Course unpublished");
                  }
                }}
              >
                {course.is_published ? <><EyeOff className="h-3.5 w-3.5" /> Unpublish</> : <><Eye className="h-3.5 w-3.5" /> Publish</>}
              </Button>
            )}

            <div className="mt-6 flex items-center gap-4">
              {!enrolled ? (
                 <Button onClick={handleEnroll} className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" disabled={enrolling}>
                   {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                   <PlayCircle className="h-4 w-4" /> Enroll Now
                 </Button>
               ) : (
                 <div className="flex items-center gap-3">
                   <Badge className="bg-success/10 text-success border-success/20">Enrolled</Badge>
                   <span className="text-sm text-muted-foreground">{progressPercent}% complete</span>
                   <CertificateCard
                     courseId={id!}
                     courseTitle={course.title}
                     progressPercent={progressPercent}
                     teacherName={course.profiles?.full_name}
                   />
                 </div>
               )}
              <span className="text-sm text-muted-foreground">{totalLessons} lessons • {modules.length} modules</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            {/* Sidebar - Module list */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Course Content</h3>
              <Accordion type="multiple" defaultValue={modules.map((m) => m.id)}>
                {modules.map((mod) => (
                  <AccordionItem key={mod.id} value={mod.id} className="border-border">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                      {mod.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1">
                        {mod.lessons?.map((lesson: any) => (
                          <li key={lesson.id}>
                            <button
                              onClick={() => setActiveLesson(lesson)}
                              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${activeLesson?.id === lesson.id ? "bg-primary/10 text-primary" : ""}`}
                            >
                              {enrolled && progress[lesson.id] ? (
                                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                              ) : (
                                lessonIcon(lesson.type)
                              )}
                              <span className="truncate">{lesson.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </aside>

            {/* Main content area */}
            <div>
              {activeLesson ? (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{activeLesson.title}</h2>
                    {enrolled && (
                      <Button size="sm" variant={progress[activeLesson.id] ? "default" : "outline"} onClick={() => toggleComplete(activeLesson.id)} className={progress[activeLesson.id] ? "bg-success text-success-foreground hover:bg-success/90" : ""}>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        {progress[activeLesson.id] ? "Completed" : "Mark Complete"}
                      </Button>
                    )}
                  </div>

                  {activeLesson.type === "video" && activeLesson.video_url && (
                    <div className="mb-6 aspect-video overflow-hidden rounded-lg bg-muted">
                      <video src={activeLesson.video_url} controls className="h-full w-full" />
                    </div>
                  )}

                  {activeLesson.type === "article" && activeLesson.content && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="code-block whitespace-pre-wrap">{activeLesson.content}</div>
                    </div>
                  )}

                  {activeLesson.type === "file" && activeLesson.file_url && (
                    <a href={activeLesson.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Download File
                      </Button>
                    </a>
                  )}

                  {!activeLesson.content && !activeLesson.video_url && !activeLesson.file_url && (
                    <p className="text-muted-foreground">No content available yet for this lesson.</p>
                  )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
                  <p className="text-muted-foreground">Select a lesson to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Assignments Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> Assignments ({assignments.length})
              </h3>
              {course.teacher_id === user?.id && (
                <Dialog open={createAssignOpen} onOpenChange={setCreateAssignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                      <Plus className="h-4 w-4" /> New Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Assignment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAssignment} className="space-y-4">
                      <div>
                        <Label>Title</Label>
                        <Input value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} required />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={assignDesc} onChange={(e) => setAssignDesc(e.target.value)} rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Due Date</Label>
                          <Input type="datetime-local" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} />
                        </div>
                        <div>
                          <Label>Max Marks</Label>
                          <Input type="number" value={assignMarks} onChange={(e) => setAssignMarks(e.target.value)} min={1} />
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={creatingAssign}>
                        {creatingAssign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No assignments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const isPastDue = a.due_date && new Date(a.due_date) < new Date();
                  return (
                    <Link key={a.id} to={`/assignments/${a.id}`}>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2.5">
                            <ClipboardList className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{a.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {a.max_marks} marks
                              {a.due_date && ` • Due ${format(new Date(a.due_date), "MMM d, yyyy")}`}
                            </p>
                          </div>
                        </div>
                        {isPastDue && <Badge variant="destructive" className="text-xs">Past Due</Badge>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quizzes */}
          <QuizManager courseId={id!} isTeacher={course.teacher_id === user?.id} enrolled={enrolled} />

          {/* Prerequisites (teacher management + student view) */}
          <CoursePrerequisites courseId={id!} isTeacher={course.teacher_id === user?.id} />

          {/* Content Editor (teachers only) */}
          <CourseContentEditor courseId={id!} isTeacher={course.teacher_id === user?.id} />

          {/* Student Progress (teachers only) */}
          <StudentProgressTracker courseId={id!} isTeacher={course.teacher_id === user?.id} />

          {/* Discussion Forum */}
          <CourseDiscussions courseId={id!} enrolled={enrolled} isTeacher={course.teacher_id === user?.id} />

          {/* Reviews Section */}
          <CourseReviews courseId={id!} enrolled={enrolled} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CourseDetail;
