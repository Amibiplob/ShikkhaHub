import { nextLearningLesson } from "@/features/learning/lesson-navigation";
import LessonBookmark from "@/features/courses/components/LessonBookmark";
import CourseSettings from "@/features/courses/components/CourseSettings";
import PrivateVideo from "@/components/shared/PrivateVideo";
import type {
  Course,
  Module,
  Lesson,
  LiveSession,
  Assignment,
  Recording,
} from "@/types/models";
const LessonArticle = lazy(() => import("@/features/learning/LessonArticle"));
import { privateFileUrl } from "@/lib/storage";
import PrivateFileLink from "@/components/shared/PrivateFileLink";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { checkAndAwardBadges } from "@/hooks/useBadgeChecker";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CourseReviews from "@/features/courses/components/CourseReviews";
import CertificateCard from "@/features/certificates/CertificateCard";
const CourseContentEditor = lazy(
  () => import("@/features/courses/components/CourseContentEditor"),
);
import CourseDiscussions from "@/features/courses/components/CourseDiscussions";
import StudentProgressTracker from "@/features/learning/StudentProgressTracker";
import QuizManager from "@/features/assessments/QuizManager";
import BookmarkButton from "@/features/courses/components/BookmarkButton";
import CoursePrerequisites from "@/features/courses/components/CoursePrerequisites";
import CourseAssistant from "@/features/courses/components/CourseAssistant";
import LiveSessionCard from "@/features/live-classes/LiveSessionCard";
import LiveClassScheduler from "@/features/live-classes/LiveClassScheduler";
import LiveClassModal from "@/features/live-classes/LiveClassModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  PlayCircle,
  Plus,
  Video,
  Download,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CourseDetailContent = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLesson = searchParams.get("lesson");
  const requestedLessonRef = useRef(requestedLesson);
  useEffect(() => {
    requestedLessonRef.current = requestedLesson;
  }, [requestedLesson]);
  const [course, setCourse] = useState<Course>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [completionRevision, setCompletionRevision] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const progressLocked = useRef(false);
  const [video, setVideo] = useState<{ path: string; url: string } | null>(
    null,
  );
  const [resumeLesson, setActiveLesson] = useState<Lesson>(null);
  const activeLesson =
    modules
      .flatMap((m) => m.lessons || [])
      .find((l) => l.id === requestedLesson) || resumeLesson;
  const videoUrl =
    video && video.path === activeLesson?.video_url ? video.url : null;
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveSession[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [expandedRecording, setExpandedRecording] = useState<string | null>(
    null,
  );
  const [selectedLiveClass, setSelectedLiveClass] = useState<LiveSession>(null);
  const [createAssignOpen, setCreateAssignOpen] = useState(false);
  const [creatingAssign, setCreatingAssign] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [assignMarks, setAssignMarks] = useState("100");

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetch = async () => {
      const [courseRes, modulesRes, assignRes, liveRes, recRes] =
        await Promise.all([
          supabase
            .from("courses")
            .select("*, profiles!courses_teacher_id_profiles_fkey(full_name)")
            .eq("id", id)
            .single(),
          supabase
            .from("modules")
            .select("*, lessons(*)")
            .eq("course_id", id)
            .order("sort_order"),
          supabase
            .from("assignments")
            .select("*")
            .eq("course_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("live_classes")
            .select("*")
            .eq("course_id", id)
            .order("scheduled_at", { ascending: false }),
          supabase
            .from("class_recordings")
            .select(
              "*, live_classes!class_recordings_live_class_id_fkey(course_id)",
            )
            .order("created_at", { ascending: false }),
        ]);
      if (!active) return;
      for (const result of [courseRes, modulesRes, assignRes, liveRes, recRes])
        if (result.error) throw result.error;
      setLoadError(false);
      setCourse(courseRes.data);
      setAssignments(assignRes.data || []);
      setLiveClasses(liveRes.data || []);
      // Filter recordings for this course
      const allRecs = recRes.data || [];
      setRecordings(allRecs.filter((r) => r.live_classes?.course_id === id));
      const mods = modulesRes.data || [];
      mods.forEach((m) =>
        m.lessons?.sort((a, b) => a.sort_order - b.sort_order),
      );
      setModules(mods);

      const savedProgress: Record<string, boolean> = {};
      if (user) {
        const { data: enrollment, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", id)
          .maybeSingle();
        if (enrollmentError) throw enrollmentError;
        if (!active) return;
        setEnrolled(!!enrollment);

        const allLessonIds = mods.flatMap(
          (m) => m.lessons?.map((l) => l.id) || [],
        );
        if (allLessonIds.length > 0) {
          const { data: prog, error: progressError } = await supabase
            .from("lesson_progress")
            .select("lesson_id, completed")
            .eq("user_id", user.id)
            .in("lesson_id", allLessonIds);
          if (progressError) throw progressError;
          if (!active) return;
          const map = savedProgress;
          prog?.forEach((p) => {
            if (p.completed) map[p.lesson_id] = true;
          });
          setProgress(map);
        }
      }

      if (!active) return;
      setActiveLesson(
        nextLearningLesson(
          mods.flatMap((m) => m.lessons || []),
          savedProgress,
          requestedLessonRef.current,
        ),
      );
      setLoading(false);
    };
    void fetch().catch(() => {
      if (active) {
        setLoadError(true);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id, user, revision]);

  useEffect(() => {
    let active = true;
    const path = activeLesson?.video_url;
    if (path)
      privateFileUrl("lesson-files", path)
        .then((url) => {
          if (active) setVideo({ path, url });
        })
        .catch(() => {
          if (active) toast.error("Could not load this video");
        });
    return () => {
      active = false;
    };
  }, [activeLesson?.video_url]);

  const selectLesson = (lesson: Lesson) => {
    if (!lesson) return;
    setActiveLesson(lesson);
    const params = new URLSearchParams(searchParams);
    params.set("lesson", lesson.id);
    setSearchParams(params);
    document.getElementById("lesson-content")?.focus();
  };

  const handleEnroll = async () => {
    if (!user) return navigate("/auth", { state: { from: `/courses/${id}` } });
    if (course?.price_bdt > 0) {
      toast.info("Paid enrollment is not available yet");
      return;
    }
    setEnrolling(true);
    const { error } = await supabase
      .from("enrollments")
      .insert({ user_id: user.id, course_id: id! });
    if (error) toast.error("Failed to enroll");
    else {
      setEnrolled(true);
      setRevision((r) => r + 1);
      toast.success("Enrolled successfully!");
      checkAndAwardBadges(user.id);
    }
    setEnrolling(false);
  };

  const toggleComplete = async (lessonId: string) => {
    if (!user || !enrolled || progressLocked.current) return;
    progressLocked.current = true;
    setSavingProgress(true);
    try {
      const result = progress[lessonId]
        ? await supabase
            .from("lesson_progress")
            .delete()
            .eq("user_id", user.id)
            .eq("lesson_id", lessonId)
            .select("lesson_id")
        : await supabase
            .from("lesson_progress")
            .upsert(
              {
                user_id: user.id,
                lesson_id: lessonId,
                completed: true,
                completed_at: new Date().toISOString(),
              },
              { onConflict: "user_id,lesson_id" },
            )
            .select("lesson_id");
      if (result.error || result.data?.length !== 1)
        throw new Error("Progress write rejected");
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .in(
          "lesson_id",
          modules.flatMap((m) => m.lessons?.map((l) => l.id) || []),
        );
      if (error) throw error;
      setProgress(
        Object.fromEntries(
          (data || [])
            .filter((p) => p.completed)
            .map((p) => [p.lesson_id, true]),
        ),
      );
      toast.success(
        progress[lessonId]
          ? "Lesson marked incomplete"
          : "Lesson progress saved",
      );
      void checkAndAwardBadges(user.id);
    } catch {
      toast.error(t("completion.progressError"));
    } finally {
      progressLocked.current = false;
      setSavingProgress(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setCreatingAssign(true);
    const { data, error } = await supabase
      .from("assignments")
      .insert({
        course_id: id,
        teacher_id: user.id,
        title: assignTitle,
        description: assignDesc || null,
        due_date: assignDue ? new Date(assignDue).toISOString() : null,
        max_marks: parseInt(assignMarks) || 100,
      })
      .select()
      .single();
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

  const lessons = modules.flatMap((m) => m.lessons || []);
  const totalLessons = lessons.length;
  const lessonIndex = lessons.findIndex((l) => l.id === activeLesson?.id);
  const completedCount = Object.keys(progress).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (loading)
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );

  if (loadError)
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="container mx-auto flex-1 px-4 py-12"
        >
          <h1 className="text-2xl font-semibold">Course unavailable</h1>
          <p role="alert" className="my-4">
            We couldn't load this course. Check your connection and access, then
            try again.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setLoading(true);
                setRevision((r) => r + 1);
              }}
            >
              Retry course
            </Button>
            <Button asChild variant="outline">
              <Link to="/courses">Back to courses</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (!course)
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div>
            <h1>Course not found</h1>
            <Link to="/courses">Back to courses</Link>
          </div>
        </div>
      </div>
    );

  const lessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-info" />;
      case "article":
        return <FileText className="h-4 w-4 text-primary" />;
      case "file":
        return <Download className="h-4 w-4 text-warning" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="border-b border-border bg-gradient-hero py-10">
          <div className="container mx-auto px-4">
            <Link
              to="/courses"
              className="mb-4 inline-block py-2 text-sm text-primary underline underline-offset-4"
            >
              ← Back to courses
            </Link>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {course.category && (
                <Badge
                  variant="outline"
                  className="text-primary border-primary/30"
                >
                  {course.category}
                </Badge>
              )}
              {course.difficulty && (
                <Badge variant="outline">{course.difficulty}</Badge>
              )}
              {course.teacher_id === user?.id && (
                <Badge variant={course.is_published ? "default" : "secondary"}>
                  {course.is_published ? "Published" : "Draft"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <h1 className="mb-2 text-3xl font-bold md:text-4xl">
                {course.title}
              </h1>
              <BookmarkButton courseId={id!} />
            </div>
            {course.description && (
              <p className="max-w-2xl text-muted-foreground">
                {course.description}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              by {course.profiles?.full_name || "Unknown"}
            </p>

            {/* Publish toggle for teacher */}
            {course.teacher_id === user?.id && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={async () => {
                  const newVal = !course.is_published;
                  const { error } = newVal
                    ? await supabase.rpc("request_course_review", {
                        target_course: id!,
                      })
                    : await supabase
                        .from("courses")
                        .update({ is_published: false })
                        .eq("id", id);
                  if (error) toast.error(error.message);
                  else {
                    setCourse({
                      ...course,
                      is_published: false,
                      review_status: newVal ? "pending" : course.review_status,
                    });
                    toast.success(
                      newVal
                        ? "Course submitted for review"
                        : "Course unpublished",
                    );
                  }
                }}
              >
                {course.is_published ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />{" "}
                    {course.review_status === "pending"
                      ? "Resubmit for review"
                      : "Submit for review"}
                  </>
                )}
              </Button>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {!enrolled && course.teacher_id !== user?.id ? (
                <Button
                  onClick={handleEnroll}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2"
                  disabled={enrolling || course.price_bdt > 0}
                >
                  {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                  <PlayCircle className="h-4 w-4" />{" "}
                  {course.price_bdt > 0
                    ? `৳${course.price_bdt} · Enrollment unavailable`
                    : "Enroll Now"}
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-success/10 text-success border-success/20">
                    {enrolled ? "Enrolled" : "Course owner"}
                  </Badge>
                  {enrolled && (
                    <span className="text-sm text-muted-foreground">
                      {progressPercent}% of lessons complete
                    </span>
                  )}
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                {totalLessons} lessons • {modules.length} modules
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <nav
            aria-label="Course sections"
            className="mb-6 flex flex-wrap gap-3 text-sm"
          >
            <a
              href={
                enrolled && progressPercent === 100
                  ? "#course-completion"
                  : "#lesson-content"
              }
              className="rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground"
            >
              {enrolled
                ? progressPercent === 100
                  ? "Review course requirements"
                  : "Continue Learning"
                : "View curriculum"}
            </a>
            <a href="#course-live" className="rounded-lg border px-4 py-3">
              Live Classes
            </a>
            <a href="#course-quizzes" className="rounded-lg border px-4 py-3">
              Assessments
            </a>
          </nav>
          {enrolled && (
            <div id="course-completion" className="mb-6 scroll-mt-24">
              <CertificateCard
                courseId={id!}
                completedLessons={completedCount}
                totalLessons={totalLessons}
                assessmentRevision={completionRevision}
              />
            </div>
          )}
          <div className="grid min-w-0 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* Sidebar - Module list */}
            <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:self-start">
              <details
                open
                className="rounded-xl border border-border bg-card p-4"
              >
                <summary className="cursor-pointer py-2 font-semibold">
                  Curriculum · {totalLessons} lessons
                </summary>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Course Content
                </h3>
                <Accordion
                  type="multiple"
                  defaultValue={modules.map((m) => m.id)}
                >
                  {modules.map((mod) => (
                    <AccordionItem
                      key={mod.id}
                      value={mod.id}
                      className="border-border"
                    >
                      <AccordionTrigger className="text-sm font-medium hover:no-underline">
                        {mod.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1">
                          {mod.lessons?.map((lesson) => (
                            <li key={lesson.id}>
                              <button
                                onClick={() => selectLesson(lesson)}
                                aria-current={
                                  activeLesson?.id === lesson.id
                                    ? "step"
                                    : undefined
                                }
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
              </details>
            </aside>

            {/* Main content area */}
            <div className="order-1 min-w-0 lg:order-2">
              {activeLesson ? (
                <div
                  id="lesson-content"
                  tabIndex={-1}
                  className="scroll-mt-24 rounded-xl border border-border bg-card p-4 sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">{activeLesson.title}</h2>
                    {enrolled && <LessonBookmark lessonId={activeLesson.id} />}
                    {enrolled && (
                      <Button
                        size="sm"
                        variant={
                          progress[activeLesson.id] ? "default" : "outline"
                        }
                        disabled={savingProgress}
                        aria-pressed={!!progress[activeLesson.id]}
                        title={
                          progress[activeLesson.id]
                            ? t("completion.undo")
                            : undefined
                        }
                        onClick={() => toggleComplete(activeLesson.id)}
                        className={
                          progress[activeLesson.id]
                            ? "bg-success text-success-foreground hover:bg-success/90"
                            : ""
                        }
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        {progress[activeLesson.id]
                          ? t("completion.lessonCompleted")
                          : t("completion.mark")}
                      </Button>
                    )}
                  </div>

                  <nav
                    aria-label="Lesson navigation"
                    className="mb-6 flex flex-wrap items-center justify-between gap-2 border-y py-3"
                  >
                    <Button
                      variant="outline"
                      disabled={lessonIndex <= 0}
                      onClick={() => selectLesson(lessons[lessonIndex - 1])}
                    >
                      Previous Lesson
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Lesson {lessonIndex + 1} of {totalLessons}
                    </span>
                    <Button
                      variant="outline"
                      disabled={lessonIndex >= totalLessons - 1}
                      onClick={() => selectLesson(lessons[lessonIndex + 1])}
                    >
                      Next Lesson
                    </Button>
                  </nav>
                  {activeLesson.type === "video" && activeLesson.video_url && (
                    <div className="mb-6 aspect-video overflow-hidden rounded-lg bg-muted">
                      <video
                        src={videoUrl || undefined}
                        controls
                        className="h-full w-full"
                      />
                    </div>
                  )}

                  {activeLesson.type === "article" && activeLesson.content && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <Suspense fallback={<p role="status">Loading lesson…</p>}>
                        <LessonArticle content={activeLesson.content} />
                      </Suspense>
                    </div>
                  )}

                  {activeLesson.type === "file" && activeLesson.file_url && (
                    <PrivateFileLink
                      bucket="lesson-files"
                      path={activeLesson.file_url}
                    >
                      Download File
                    </PrivateFileLink>
                  )}

                  {!activeLesson.content &&
                    !activeLesson.video_url &&
                    !activeLesson.file_url && (
                      <p className="text-muted-foreground">
                        No content available yet for this lesson.
                      </p>
                    )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
                  <p className="text-muted-foreground">
                    {enrolled || course.teacher_id === user?.id
                      ? "Select a lesson to get started"
                      : "Enroll to access course lessons"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {course.teacher_id === user?.id && (
            <CourseSettings course={course} onSaved={setCourse} />
          )}

          {/* Live Classes Section */}
          <div id="course-live" className="mt-8 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" /> Live Classes (
                {
                  liveClasses.filter(
                    (lc) => !["completed", "expired"].includes(lc.status),
                  ).length
                }
                )
              </h3>
              {course.teacher_id === user?.id && (
                <LiveClassScheduler
                  courses={[{ id: course.id, title: course.title }]}
                  onCreated={(session) =>
                    setLiveClasses((prev) => [...prev, session])
                  }
                />
              )}
            </div>

            {liveClasses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No live classes scheduled
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveClasses.map((session) => (
                  <LiveSessionCard
                    key={session.id}
                    session={session}
                    onOpen={setSelectedLiveClass}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Class Recordings Section */}
          {recordings.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Film className="h-5 w-5 text-primary" /> Class Recordings (
                {recordings.length})
              </h3>
              <div className="space-y-3">
                {recordings.map((rec) => {
                  const isExpanded = expandedRecording === rec.id;
                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2.5">
                            <Film className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{rec.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(
                                new Date(rec.created_at),
                                "MMM d, yyyy 'at' h:mm a",
                              )}
                              {rec.duration_seconds &&
                                ` • ${Math.floor(rec.duration_seconds / 60)} min`}
                              {rec.file_size &&
                                ` • ${(rec.file_size / (1024 * 1024)).toFixed(1)} MB`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PrivateFileLink
                            bucket="class-recordings"
                            path={rec.file_url}
                          >
                            Download recording
                          </PrivateFileLink>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            aria-expanded={isExpanded}
                            aria-controls={`recording-${rec.id}`}
                            onClick={() =>
                              setExpandedRecording(isExpanded ? null : rec.id)
                            }
                          >
                            <PlayCircle className="h-3.5 w-3.5" />{" "}
                            {isExpanded ? "Collapse" : "Watch"}
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div
                          id={`recording-${rec.id}`}
                          className="mt-3 aspect-video rounded-lg overflow-hidden bg-black"
                        >
                          <PrivateVideo
                            bucket="class-recordings"
                            path={rec.file_url}
                            autoPlay
                            className="h-full w-full"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assignments Section */}
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> Assignments (
                {assignments.length})
              </h3>
              {course.teacher_id === user?.id && (
                <Dialog
                  open={createAssignOpen}
                  onOpenChange={setCreateAssignOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2"
                    >
                      <Plus className="h-4 w-4" /> New Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Assignment</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={handleCreateAssignment}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="coursedetail-field-5">Title</Label>
                        <Input
                          id="coursedetail-field-5"
                          value={assignTitle}
                          onChange={(e) => setAssignTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="coursedetail-field-6">
                          Description
                        </Label>
                        <Textarea
                          id="coursedetail-field-6"
                          value={assignDesc}
                          onChange={(e) => setAssignDesc(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="coursedetail-field-7">Due Date</Label>
                          <Input
                            id="coursedetail-field-7"
                            type="datetime-local"
                            value={assignDue}
                            onChange={(e) => setAssignDue(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="coursedetail-field-8">
                            Max Marks
                          </Label>
                          <Input
                            id="coursedetail-field-8"
                            type="number"
                            value={assignMarks}
                            onChange={(e) => setAssignMarks(e.target.value)}
                            min={1}
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                        disabled={creatingAssign}
                      >
                        {creatingAssign && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}{" "}
                        Create
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
                  const isPastDue =
                    a.due_date && new Date(a.due_date) < new Date();
                  return (
                    <Link key={a.id} to={`/assignments/${a.id}`}>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2.5">
                            <ClipboardList className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{a.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {a.max_marks} marks
                              {a.due_date &&
                                ` • Due ${format(new Date(a.due_date), "MMM d, yyyy")}`}
                            </p>
                          </div>
                        </div>
                        {isPastDue && (
                          <Badge variant="destructive" className="text-xs">
                            Past Due
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quizzes */}
          <div id="course-quizzes" className="scroll-mt-24">
            <QuizManager
              courseId={id!}
              isTeacher={course.teacher_id === user?.id}
              enrolled={enrolled}
              onAttemptSaved={() => setCompletionRevision((r) => r + 1)}
            />
          </div>

          {/* Prerequisites (teacher management + student view) */}
          <CoursePrerequisites
            courseId={id!}
            isTeacher={course.teacher_id === user?.id}
          />

          {/* Content Editor (teachers only) */}
          {course.teacher_id === user?.id && (
            <Suspense fallback={<p role="status">Loading lesson editor…</p>}>
              <CourseContentEditor courseId={id!} isTeacher={true} />
            </Suspense>
          )}

          {/* Student Progress (teachers only) */}
          <StudentProgressTracker
            courseId={id!}
            isTeacher={course.teacher_id === user?.id}
          />

          {/* Discussion Forum */}
          <CourseDiscussions
            courseId={id!}
            enrolled={enrolled}
            isTeacher={course.teacher_id === user?.id}
          />

          {/* Reviews Section */}
          <CourseReviews courseId={id!} enrolled={enrolled} />
        </div>

        <LiveClassModal
          liveClass={selectedLiveClass}
          open={!!selectedLiveClass}
          onOpenChange={(open) => {
            if (!open) setSelectedLiveClass(null);
          }}
          onStatusChange={(lcId, status) => {
            setLiveClasses((prev) =>
              prev.map((lc) => (lc.id === lcId ? { ...lc, status } : lc)),
            );
          }}
        />
      </main>
      <Footer />
      {enrolled && (
        <CourseAssistant courseId={id!} courseTitle={course.title} />
      )}
    </div>
  );
};

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  return <CourseDetailContent key={`${id}:${user?.id || "guest"}`} />;
}
