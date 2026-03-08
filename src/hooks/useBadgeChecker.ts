import { supabase } from "@/integrations/supabase/client";

/**
 * Check and award badges for the current user based on their activity.
 * Call this after key actions (completing lessons, enrolling, posting, etc.)
 */
export const checkAndAwardBadges = async (userId: string) => {
  // Fetch all badges and user's earned badges
  const [{ data: allBadges }, { data: earnedBadges }] = await Promise.all([
    supabase.from("badges").select("*"),
    supabase.from("user_badges").select("badge_id").eq("user_id", userId),
  ]);

  if (!allBadges) return;
  const earnedSet = new Set(earnedBadges?.map((b) => b.badge_id) || []);
  const unearned = allBadges.filter((b) => !earnedSet.has(b.id));
  if (unearned.length === 0) return;

  // Fetch counts in parallel
  const [lessonsRes, certsRes, enrollRes, postsRes, commentsRes, reviewsRes] = await Promise.all([
    supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
    supabase.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("community_comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("course_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const counts: Record<string, number> = {
    lessons_completed: lessonsRes.count || 0,
    courses_completed: 0, // We'll compute this separately if needed
    certificates_earned: certsRes.count || 0,
    enrollments: enrollRes.count || 0,
    posts_created: postsRes.count || 0,
    comments_created: commentsRes.count || 0,
    reviews_written: reviewsRes.count || 0,
  };

  const toAward = unearned.filter((badge) => {
    const count = counts[badge.criteria_type] ?? 0;
    return count >= badge.criteria_value;
  });

  if (toAward.length === 0) return;

  const inserts = toAward.map((b) => ({ user_id: userId, badge_id: b.id }));
  const { error } = await supabase.from("user_badges").insert(inserts);
  
  if (!error && toAward.length > 0) {
    // Create notification for each badge earned
    const notifications = toAward.map((b) => ({
      user_id: userId,
      title: "Badge Earned! 🎉",
      message: `You earned the "${b.name}" badge: ${b.description}`,
      type: "badge",
      link: "/achievements",
    }));
    await supabase.from("notifications").insert(notifications);
  }

  return toAward;
};
