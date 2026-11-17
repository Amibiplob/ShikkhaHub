import { readAllRows } from '@/lib/read-all-rows';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Course, LiveSession } from "@/types/models";

type DashboardData = {
  enrolledCourses: Course[];
  teacherCourses: Course[];
  bookmarkedCourses: Course[];
  liveClasses: LiveSession[];
  studentLiveClasses: LiveSession[];
  courseProgress: Record<string, number>;
  certifiedCourses: string[];
};
const empty: DashboardData = {
  enrolledCourses: [],
  teacherCourses: [],
  bookmarkedCourses: [],
  liveClasses: [],
  studentLiveClasses: [],
  courseProgress: {},
  certifiedCourses: [],
};

/** Account-scoped reads, committed together so partial failures never look like an empty account. */
export function useDashboardData(
  userId: string | undefined,
  teaching: boolean,
) {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      if (!userId) return;
      const [
        enrollments,
        bookmarks,
        teacherCourses,
        liveClasses,
        certificates,
      ] = await Promise.all([
        readAllRows(supabase
          .from("enrollments")
          .select(
            "course_id, courses(*, profiles!courses_teacher_id_profiles_fkey(full_name))", { count: 'exact' },
          )
          .eq("user_id", userId), controller.signal),
        readAllRows(supabase
          .from("course_bookmarks")
          .select(
            "course_id, courses(*, profiles!courses_teacher_id_profiles_fkey(full_name))", { count: 'exact' },
          )
          .eq("user_id", userId), controller.signal),
        teaching
          ? readAllRows(supabase
              .from("courses")
              .select("*", { count: 'exact' })
              .eq("teacher_id", userId)
              .order("created_at", { ascending: false }), controller.signal)
          : { data: [], error: null },
        teaching
          ? readAllRows(supabase
              .from("live_classes")
              .select("*, courses(title)", { count: 'exact' })
              .eq("teacher_id", userId)
              .order("scheduled_at"), controller.signal)
          : { data: [], error: null },
        readAllRows(supabase
          .from("certificates")
          .select("course_id", { count: 'exact' })
          .eq("user_id", userId)
          .not("validated_at", "is", null)
          .is("revoked_at", null), controller.signal),
      ]);
      for (const result of [
        enrollments,
        bookmarks,
        teacherCourses,
        liveClasses,
        certificates,
      ])
        if (result.error) throw result.error;
      const enrolledCourses =
        enrollments.data?.flatMap((e) => (e.courses ? [e.courses] : [])) || [];
      const ids = enrolledCourses.map((c) => c.id);
      const courseProgress: Record<string, number> = {};
      let studentLiveClasses: LiveSession[] = [];
      if (ids.length) {
        const [modules, progress, live] = await Promise.all([
          readAllRows(supabase
            .from("modules")
            .select("id, course_id, lessons(id)", { count: 'exact' })
            .in("course_id", ids), controller.signal),
          readAllRows(supabase
            .from("lesson_progress")
            .select("lesson_id", { count: 'exact' })
            .eq("user_id", userId)
            .eq("completed", true), controller.signal),
          readAllRows(supabase
            .from("live_classes")
            .select("*, courses(title)", { count: 'exact' })
            .in("course_id", ids)
            .in("status", ["scheduled", "live"])
            .order("scheduled_at"), controller.signal),
        ]);
        for (const result of [modules, progress, live])
          if (result.error) throw result.error;
        const completed = new Set(progress.data?.map((p) => p.lesson_id));
        for (const id of ids) {
          const lessons =
            modules.data
              ?.filter((m) => m.course_id === id)
              .flatMap((m) => m.lessons || []) || [];
          courseProgress[id] = lessons.length
            ? Math.round(
                (100 * lessons.filter((l) => completed.has(l.id)).length) /
                  lessons.length,
              )
            : 0;
        }
        studentLiveClasses = live.data || [];
      }
      if (active) {
        setData({
          enrolledCourses,
          courseProgress,
          studentLiveClasses,
          teacherCourses: teacherCourses.data || [],
          liveClasses: liveClasses.data || [],
          bookmarkedCourses:
            bookmarks.data?.flatMap((b) => (b.courses ? [b.courses] : [])) ||
            [],
          certifiedCourses: certificates.data?.flatMap((c) => c.course_id ? [c.course_id] : []) || [],
        });
        setError(false);
      }
    }
    void load()
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false; controller.abort();
    };
  }, [userId, teaching, revision]);
  return {
    ...data,
    loading,
    error,
    refresh: () => {
      setLoading(true);
      setRevision((r) => r + 1);
    },
  };
}
