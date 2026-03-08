import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

interface BookmarkButtonProps {
  courseId: string;
  size?: "sm" | "default" | "icon";
}

const BookmarkButton = ({ courseId, size = "icon" }: BookmarkButtonProps) => {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("course_bookmarks").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle()
      .then(({ data }) => setBookmarked(!!data));
  }, [user, courseId]);

  const toggle = async () => {
    if (!user) { toast.error("Sign in to bookmark"); return; }
    setLoading(true);
    if (bookmarked) {
      await supabase.from("course_bookmarks").delete().eq("user_id", user.id).eq("course_id", courseId);
      setBookmarked(false);
    } else {
      await supabase.from("course_bookmarks").insert({ user_id: user.id, course_id: courseId });
      setBookmarked(true);
      toast.success("Bookmarked!");
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={loading}
      className={`h-8 w-8 ${bookmarked ? "text-primary" : "text-muted-foreground"}`}
      title={bookmarked ? "Remove bookmark" : "Bookmark"}
    >
      <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-primary" : ""}`} />
    </Button>
  );
};

export default BookmarkButton;
