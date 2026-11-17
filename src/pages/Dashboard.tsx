import CreateCourseDialog from "@/features/courses/components/CreateCourseDialog";
import { lazy, Suspense } from "react";
import type { LiveSession } from "@/types/models";
import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import Header from "@/components/layout/Header";
import CourseCard from "@/features/courses/components/CourseCard";
import { useDashboardData } from "@/features/learning/useDashboardData";
import LiveSessionCard from "@/features/live-classes/LiveSessionCard";
import { useLanguage } from "@/hooks/useLanguage";
import AssessmentTasks from "@/features/learning/AssessmentTasks";
import ProfileEditor from "@/features/auth/ProfileEditor";
import LiveClassScheduler from "@/features/live-classes/LiveClassScheduler";
import LiveClassModal from "@/features/live-classes/LiveClassModal";
import { Button } from "@/components/ui/button";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Bookmark,
  BookOpen,
  GraduationCap,
  Video,
} from "lucide-react";
const TutoringWorkspace = lazy(
  () => import("@/features/tutoring/TutoringWorkspace"),
);
const StudentAnalytics = lazy(
  () => import("@/features/learning/StudentAnalytics"),
);

const DashboardContent = () => {
  const { user, loading: authLoading, hasRole, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLanguage();
  const bn = lang === "bn";
  const isTeacher = hasRole("teacher");
  const requestedTab = searchParams.get("tab");
  const allowedTabs = [
    "learning",
    "live",
    "bookmarks",
    "analytics",
    "tutoring",
    ...(isTeacher ? ["teaching"] : []),
  ];
  const tab = allowedTabs.includes(requestedTab || "")
    ? requestedTab!
    : isTeacher
      ? "teaching"
      : "learning";
  const teaching = isTeacher && tab !== "learning" && tab !== "bookmarks";
  const {
    enrolledCourses,
    courseProgress,
    teacherCourses,
    liveClasses,
    studentLiveClasses,
    bookmarkedCourses,
    certifiedCourses,
    loading,
    error,
    refresh,
  } = useDashboardData(user?.id, isTeacher);
  const nextCourse =
    enrolledCourses.find(
      (c) => !certifiedCourses.includes(c.id) && courseProgress[c.id] < 100,
    ) || enrolledCourses.find((c) => !certifiedCourses.includes(c.id));
  const [selectedLiveClass, setSelectedLiveClass] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (!authLoading && hasRole("admin") && !searchParams.has("tab"))
    return <Navigate to="/admin" replace />;

  if (authLoading || loading)
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p role="status">
            {bn ? "কর্মক্ষেত্র লোড হচ্ছে…" : "Loading your workspace…"}
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 container mx-auto px-4 py-8"
      >
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {profile?.full_name || "there"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {isTeacher
                ? "Manage your courses and track student progress"
                : "Continue learning where you left off"}
            </p>
          </div>
          <ProfileEditor onUpdated={() => window.location.reload()} />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-destructive/40 p-5"
          >
            <p>
              {bn
                ? "আপনার তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।"
                : "Could not load your workspace. Your saved work is unchanged."}
            </p>
            <Button className="mt-3" onClick={refresh}>
              {bn ? "আবার চেষ্টা করুন" : "Retry workspace"}
            </Button>
          </div>
        )}
        <nav
          aria-label="Workspace shortcuts"
          className="mb-8 flex flex-wrap gap-3"
        >
          {isTeacher && (
            <Button asChild variant="outline">
              <Link to="/analytics">Student Progress</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/certificates">Certificates</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard?tab=tutoring">Tutoring appointments</Link>
          </Button>
        </nav>
        {!error && tab === "learning" && enrolledCourses.length > 0 && (
          <section
            className="mb-8 rounded-xl border border-primary/30 bg-card p-6"
            aria-label="Continue Learning"
          >
            <p className="text-sm text-muted-foreground">
              {bn ? "আপনার পরবর্তী ধাপ" : "Your next step"}
            </p>
            <h2 className="my-2 text-xl font-semibold">
              {nextCourse
                ? nextCourse.title
                : bn
                  ? "আপনার সনদ প্রস্তুত"
                  : "Your certificates are ready"}
            </h2>
            <Button asChild>
              <Link
                to={
                  nextCourse
                    ? `/courses/${nextCourse.id}${courseProgress[nextCourse.id] === 100 ? "#course-completion" : ""}`
                    : "/certificates"
                }
              >
                {nextCourse
                  ? courseProgress[nextCourse.id] < 100
                    ? bn
                      ? "শেখা চালিয়ে যান"
                      : "Continue Learning"
                    : bn
                      ? "বাকি শর্ত দেখুন"
                      : "Complete Requirements"
                  : bn
                    ? "সনদ দেখুন"
                    : "View Certificates"}
              </Link>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">
              {bn
                ? "পাঠের অগ্রগতি সংরক্ষিত আছে। কোর্স শেষ করতে মূল্যায়নও সম্পন্ন করুন।"
                : "Lesson progress is saved. Complete the assessments to finish your course."}
            </p>
          </section>
        )}
        {!error && ["learning", "teaching"].includes(tab) && (
          <>
            {(teaching ? liveClasses : studentLiveClasses).some((c) =>
              ["scheduled", "live"].includes(c.status),
            ) && (
              <section
                aria-label="Upcoming Live Classes"
                className="mb-8 space-y-3"
              >
                <h2 className="text-xl font-semibold">
                  {bn ? "লাইভ ও আসন্ন ক্লাস" : "Live & upcoming classes"}
                </h2>
                {(teaching ? liveClasses : studentLiveClasses)
                  .filter((c) => ["scheduled", "live"].includes(c.status))
                  .sort(
                    (a, b) =>
                      Number(b.status === "live") - Number(a.status === "live"),
                  )
                  .slice(0, 3)
                  .map((session) => (
                    <LiveSessionCard
                      key={session.id}
                      session={session}
                      onOpen={setSelectedLiveClass}
                    />
                  ))}
              </section>
            )}
            <AssessmentTasks
              key={`${user?.id}:${teaching}`}
              courseIds={(teaching ? teacherCourses : enrolledCourses).map(
                (c) => c.id,
              )}
              teaching={teaching}
            />
          </>
        )}
        {!error && (
          <Tabs
            value={tab}
            onValueChange={(value) => {
              const params = new URLSearchParams(searchParams);
              params.set("tab", value);
              setSearchParams(params, { replace: true });
            }}
          >
            <TabsList>
              {isTeacher && (
                <TabsTrigger value="teaching">My Courses</TabsTrigger>
              )}
              <TabsTrigger value="learning">
                {bn ? "আমার শেখা" : "My learning"}
              </TabsTrigger>
              <TabsTrigger value="live">
                <Video className="mr-1.5 h-3.5 w-3.5" /> Live Classes
              </TabsTrigger>
              <TabsTrigger value="bookmarks">
                <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Saved
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="tutoring">
                {hasRole("teacher")
                  ? "Tutoring Management"
                  : "My Tutoring Sessions"}
              </TabsTrigger>
            </TabsList>

            {isTeacher && (
              <TabsContent value="teaching">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Your Courses</h2>
                  <CreateCourseDialog onCreated={refresh} />
                </div>

                {teacherCourses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-16 text-center">
                    <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      You haven't created any courses yet
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {teacherCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        {...course}
                        actionLabel="Manage lessons & assessments →"
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="learning">
              {enrolledCourses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">
                    You're not enrolled in any courses yet
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/courses")}
                  >
                    Browse Courses
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {enrolledCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      thumbnail_url={course.thumbnail_url}
                      category={course.category}
                      difficulty={course.difficulty}
                      teacher_name={course.profiles?.full_name}
                      progressPercent={courseProgress[course.id]}
                      actionLabel={
                        certifiedCourses.includes(course.id)
                          ? "Review course · Certificate issued →"
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="live">
              {isTeacher && (
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Your Live Classes</h2>
                  <LiveClassScheduler
                    courses={teacherCourses.map((c) => ({
                      id: c.id,
                      title: c.title,
                    }))}
                    onCreated={refresh}
                  />
                </div>
              )}

              <div className="space-y-3 mb-6">
                {(isTeacher ? liveClasses : studentLiveClasses).map(
                  (session) => (
                    <LiveSessionCard
                      key={session.id}
                      session={session}
                      onOpen={setSelectedLiveClass}
                    />
                  ),
                )}
              </div>

              {/* Empty states */}
              {isTeacher && liveClasses.length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No live classes scheduled yet
                  </p>
                </div>
              )}
              {!isTeacher && studentLiveClasses.length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No live classes available for your enrolled courses
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookmarks">
              {bookmarkedCourses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">
                    No bookmarked courses yet
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/courses")}
                  >
                    Browse Courses
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {bookmarkedCourses.map((course) => (
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
            </TabsContent>

            <TabsContent value="analytics">
              <Suspense fallback={<p role="status">Loading analytics…</p>}>
                {isTeacher ? (
                  <div>
                    <h2 className="text-xl font-semibold">
                      Student progress and grading
                    </h2>
                    <p className="my-3">
                      Review your students and open a course to manage lessons,
                      quizzes and assignments.
                    </p>
                    <Button asChild>
                      <Link to="/analytics">View teaching analytics</Link>
                    </Button>
                  </div>
                ) : (
                  <StudentAnalytics />
                )}
              </Suspense>
            </TabsContent>
            <TabsContent value="tutoring">
              <Suspense fallback={<p role="status">Loading tutoring…</p>}>
                <TutoringWorkspace />
              </Suspense>
            </TabsContent>
          </Tabs>
        )}

        <LiveClassModal
          liveClass={selectedLiveClass}
          open={!!selectedLiveClass}
          onOpenChange={(open) => {
            if (!open) setSelectedLiveClass(null);
          }}
          onStatusChange={refresh}
        />
      </main>
    </div>
  );
};

export default function Dashboard() {
  const { user, roles } = useAuth();
  return <DashboardContent key={`${user?.id}:${roles.join(",")}`} />;
}
