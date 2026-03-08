import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Loader2, Reply, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CourseDiscussionsProps {
  courseId: string;
  enrolled: boolean;
  isTeacher: boolean;
}

const CourseDiscussions = ({ courseId, enrolled, isTeacher }: CourseDiscussionsProps) => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const fetchDiscussions = async () => {
    const { data } = await supabase
      .from("course_discussions")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    const items = data || [];
    setDiscussions(items);

    // Fetch profiles for all unique users
    const userIds = [...new Set(items.map((d) => d.user_id))];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const map: Record<string, any> = {};
      profilesData?.forEach((p) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDiscussions();
  }, [courseId]);

  const handlePost = async (parentId: string | null = null) => {
    if (!user) return;
    const text = parentId ? replyContent : content;
    if (!text.trim()) return;

    setPosting(true);
    const { error } = await supabase.from("course_discussions").insert({
      course_id: courseId,
      user_id: user.id,
      parent_id: parentId,
      content: text.trim(),
    });

    if (error) toast.error(error.message);
    else {
      if (parentId) {
        setReplyContent("");
        setReplyTo(null);
      } else {
        setContent("");
      }
      fetchDiscussions();
    }
    setPosting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("course_discussions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetchDiscussions();
  };

  const canPost = enrolled || isTeacher;

  // Build thread structure
  const topLevel = discussions.filter((d) => !d.parent_id);
  const replies = discussions.filter((d) => d.parent_id);
  const getReplies = (parentId: string) => replies.filter((r) => r.parent_id === parentId);

  const getInitials = (userId: string) => {
    const name = profiles[userId]?.full_name || "";
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U";
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto my-8" />;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" /> Discussion ({topLevel.length})
      </h3>

      {/* Post form */}
      {canPost && (
        <div className="mb-6 flex gap-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start a discussion..."
            rows={2}
            className="flex-1"
          />
          <Button
            onClick={() => handlePost(null)}
            disabled={posting || !content.trim()}
            className="self-end gap-1.5 bg-gradient-primary text-primary-foreground"
          >
            <Send className="h-3.5 w-3.5" /> Post
          </Button>
        </div>
      )}

      {topLevel.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No discussions yet. Be the first to start one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevel.map((disc) => (
            <div key={disc.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(disc.user_id)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{profiles[disc.user_id]?.full_name || "User"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(disc.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{disc.content}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {canPost && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() => setReplyTo(replyTo === disc.id ? null : disc.id)}
                      >
                        <Reply className="h-3 w-3" /> Reply
                      </Button>
                    )}
                    {(disc.user_id === user?.id || isTeacher) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive gap-1"
                        onClick={() => handleDelete(disc.id)}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    )}
                  </div>

                  {/* Reply form */}
                  {replyTo === disc.id && (
                    <div className="mt-3 flex gap-2">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        rows={1}
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handlePost(disc.id)}
                        disabled={posting || !replyContent.trim()}
                        className="self-end gap-1 bg-gradient-primary text-primary-foreground"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Replies */}
                  {getReplies(disc.id).length > 0 && (
                    <div className="mt-3 space-y-3 border-l-2 border-border pl-4">
                      {getReplies(disc.id).map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {getInitials(reply.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium">{profiles[reply.user_id]?.full_name || "User"}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                            {(reply.user_id === user?.id || isTeacher) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs text-destructive gap-1 mt-1"
                                onClick={() => handleDelete(reply.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseDiscussions;
