import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowBigUp, ArrowLeft, Loader2, MessageSquare, Pin, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  programming: "Programming",
  career: "Career",
  hardware: "Hardware",
  ai: "AI / New Technology",
  general: "General Discussion",
};

const categoryColors: Record<string, string> = {
  programming: "bg-primary/10 text-primary border-primary/20",
  career: "bg-accent/10 text-accent border-accent/20",
  hardware: "bg-warning/10 text-warning border-warning/20",
  ai: "bg-info/10 text-info border-info/20",
  general: "bg-muted text-muted-foreground border-border",
};

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  post_id: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  replies?: Comment[];
}

const CommunityPost = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [commentUpvotes, setCommentUpvotes] = useState<Set<string>>(new Set());
  const [commentUpvoteCounts, setCommentUpvoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [postRes, commentsRes, upvotesRes] = await Promise.all([
        supabase.from("community_posts").select("*, profiles!community_posts_user_id_fkey(full_name, avatar_url)").eq("id", id).single(),
        supabase.from("community_comments").select("*, profiles!community_comments_user_id_fkey(full_name, avatar_url)").eq("post_id", id).order("created_at"),
        supabase.from("community_upvotes").select("*").eq("post_id", id),
      ]);

      setPost(postRes.data);
      setUpvoteCount(upvotesRes.data?.length || 0);
      if (user) setUpvoted(!!upvotesRes.data?.find((u) => u.user_id === user.id));

      // Organize comments into tree
      const flat = commentsRes.data || [];
      const top: Comment[] = [];
      const childMap: Record<string, Comment[]> = {};
      flat.forEach((c: any) => {
        if (c.parent_id) {
          if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
          childMap[c.parent_id].push(c);
        } else {
          top.push({ ...c, replies: [] });
        }
      });
      top.forEach((c) => { c.replies = childMap[c.id] || []; });
      setComments(top);

      // Fetch comment upvotes
      const commentIds = flat.map((c: any) => c.id);
      if (commentIds.length > 0) {
        const { data: cUpvotes } = await supabase.from("community_upvotes").select("*").in("comment_id", commentIds);
        const counts: Record<string, number> = {};
        const userUpvoted = new Set<string>();
        cUpvotes?.forEach((u) => {
          if (u.comment_id) {
            counts[u.comment_id] = (counts[u.comment_id] || 0) + 1;
            if (user && u.user_id === user.id) userUpvoted.add(u.comment_id);
          }
        });
        setCommentUpvoteCounts(counts);
        setCommentUpvotes(userUpvoted);
      }

      setLoading(false);
    };
    fetchAll();
  }, [id, user]);

  const togglePostUpvote = async () => {
    if (!user) return navigate("/auth");
    if (upvoted) {
      await supabase.from("community_upvotes").delete().eq("user_id", user.id).eq("post_id", id!);
      setUpvoted(false);
      setUpvoteCount((c) => c - 1);
    } else {
      await supabase.from("community_upvotes").insert({ user_id: user.id, post_id: id });
      setUpvoted(true);
      setUpvoteCount((c) => c + 1);
    }
  };

  const toggleCommentUpvote = async (commentId: string) => {
    if (!user) return navigate("/auth");
    if (commentUpvotes.has(commentId)) {
      await supabase.from("community_upvotes").delete().eq("user_id", user.id).eq("comment_id", commentId);
      setCommentUpvotes((prev) => { const n = new Set(prev); n.delete(commentId); return n; });
      setCommentUpvoteCounts((prev) => ({ ...prev, [commentId]: (prev[commentId] || 1) - 1 }));
    } else {
      await supabase.from("community_upvotes").insert({ user_id: user.id, comment_id: commentId });
      setCommentUpvotes((prev) => new Set(prev).add(commentId));
      setCommentUpvoteCounts((prev) => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate("/auth");
    setSubmitting(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: id!,
      user_id: user.id,
      content: comment,
    });
    if (error) toast.error(error.message);
    else {
      setComment("");
      // Refresh comments
      const { data } = await supabase.from("community_comments").select("*, profiles!community_comments_user_id_fkey(full_name, avatar_url)").eq("post_id", id!).order("created_at");
      const flat = data || [];
      const top: Comment[] = [];
      const childMap: Record<string, Comment[]> = {};
      flat.forEach((c: any) => {
        if (c.parent_id) {
          if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
          childMap[c.parent_id].push(c);
        } else {
          top.push({ ...c, replies: [] });
        }
      });
      top.forEach((c) => { c.replies = childMap[c.id] || []; });
      setComments(top);
    }
    setSubmitting(false);
  };

  const handleReply = async (parentId: string) => {
    if (!user) return navigate("/auth");
    if (!replyContent.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: id!,
      user_id: user.id,
      content: replyContent,
      parent_id: parentId,
    });
    if (error) toast.error(error.message);
    else {
      setReplyTo(null);
      setReplyContent("");
      // Refresh
      const { data } = await supabase.from("community_comments").select("*, profiles!community_comments_user_id_fkey(full_name, avatar_url)").eq("post_id", id!).order("created_at");
      const flat = data || [];
      const top: Comment[] = [];
      const childMap: Record<string, Comment[]> = {};
      flat.forEach((c: any) => {
        if (c.parent_id) {
          if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
          childMap[c.parent_id].push(c);
        } else {
          top.push({ ...c, replies: [] });
        }
      });
      top.forEach((c) => { c.replies = childMap[c.id] || []; });
      setComments(top);
    }
    setSubmitting(false);
  };

  const getInitials = (name: string | null) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

  if (loading) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );

  if (!post) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><p>Post not found</p></div></div>
  );

  const renderComment = (c: Comment, isReply = false) => (
    <div key={c.id} className={`${isReply ? "ml-8 border-l-2 border-border pl-4" : ""}`}>
      <div className="flex gap-3 py-4">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
            {getInitials(c.profiles?.full_name ?? null)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{c.profiles?.full_name || "Anonymous"}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-1 text-sm">{c.content}</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => toggleCommentUpvote(c.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${commentUpvotes.has(c.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowBigUp className={`h-4 w-4 ${commentUpvotes.has(c.id) ? "fill-primary" : ""}`} />
              {commentUpvoteCounts[c.id] || 0}
            </button>
            {!isReply && (
              <button
                onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyContent(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Reply
              </button>
            )}
          </div>

          {replyTo === c.id && (
            <div className="mt-3 flex gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="text-sm"
              />
              <Button size="sm" onClick={() => handleReply(c.id)} disabled={submitting} className="bg-gradient-primary text-primary-foreground shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {c.replies?.map((r) => renderComment(r, true))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/community" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>

        {/* Post */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <button onClick={togglePostUpvote} className={`rounded-md p-1 transition-colors ${upvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <ArrowBigUp className={`h-7 w-7 ${upvoted ? "fill-primary" : ""}`} />
              </button>
              <span className={`text-sm font-semibold ${upvoted ? "text-primary" : "text-muted-foreground"}`}>{upvoteCount}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {post.is_pinned && <Pin className="h-3.5 w-3.5 text-warning fill-warning" />}
                <Badge variant="outline" className={`text-xs ${categoryColors[post.category] || ""}`}>
                  {CATEGORY_LABELS[post.category] || post.category}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold mb-3">{post.title}</h1>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>
              <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(post.profiles?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>{post.profiles?.full_name || "Anonymous"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)} Comments
          </h3>

          {user && (
            <form onSubmit={handleComment} className="mb-6 flex gap-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                required
              />
              <Button type="submit" disabled={submitting} className="bg-gradient-primary text-primary-foreground shrink-0 self-end">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          )}

          <div className="divide-y divide-border">
            {comments.map((c) => renderComment(c))}
          </div>

          {comments.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CommunityPost;
