import { readAllRows } from '@/lib/read-all-rows';
import type { Post } from "@/types/models";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  replies: Comment[];
}

const buildTree = (flat: Omit<Comment, 'replies'>[]): Comment[] => {
  const byId = new Map<string, Comment>();
  flat.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: Comment[] = [];
  byId.forEach((c) => {
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    if (parent) parent.replies.push(c);
    else roots.push(c);
  });
  return roots;
};

const countComments = (nodes: Comment[]): number =>
  nodes.reduce((acc, n) => acc + 1 + countComments(n.replies), 0);

const CommunityPostContent = () => {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const commentsRequest = useRef(0);
  const submitLock = useRef(false);
  const voteLocks = useRef(new Set<string>());
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [commentUpvotes, setCommentUpvotes] = useState<Set<string>>(new Set());
  const [commentUpvoteCounts, setCommentUpvoteCounts] = useState<Record<string, number>>({});

  const isAdmin = hasRole("admin");
  const viewerId = user?.id;

  const loadComments = useCallback(async (postId: string) => {
    const request = ++commentsRequest.current;
    const { data: flat } = await readAllRows(supabase.from("community_comments")
      .select("*, profiles!community_comments_user_id_profiles_fkey(full_name, avatar_url)", { count: "exact" })
      .eq("post_id", postId).order("created_at"));
    const ids = flat.map(c => c.id);
    const { data: votes } = ids.length ? await readAllRows(supabase.from("community_upvotes")
      .select("comment_id,user_id", { count: "exact" }).in("comment_id", ids)) : { data: [] };
    if (request !== commentsRequest.current) return;
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const vote of votes) if (vote.comment_id) {
      counts[vote.comment_id] = (counts[vote.comment_id] ?? 0) + 1;
      if (vote.user_id === viewerId) mine.add(vote.comment_id);
    }
    setComments(buildTree(flat));
    setCommentUpvoteCounts(counts);
    setCommentUpvotes(mine);
  }, [viewerId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const [postRes, upvotesRes] = await Promise.all([
        supabase
          .from("community_posts")
          .select("*, profiles!community_posts_user_id_profiles_fkey(full_name, avatar_url)")
          .eq("id", id)
          .maybeSingle(),
        readAllRows(supabase.from("community_upvotes").select("user_id", { count: "exact" }).eq("post_id", id)),
      ]);
      if (cancelled) return;
      if (postRes.error) throw postRes.error;
      setLoadError(false);
      setPost(postRes.data);
      setUpvoteCount(upvotesRes.data?.length || 0);
      setUpvoted(!!user && !!upvotesRes.data?.find((u) => u.user_id === user.id));

      await loadComments(id);
      if (!cancelled) setLoading(false);
    };
    const request = commentsRequest;
    void fetchAll().catch(() => { if (!cancelled) { setLoadError(true); setLoading(false); } });
    return () => { cancelled = true; request.current++; };
  }, [id, user, loadComments, revision]);

  const togglePostUpvote = async () => {
    if (!user) {
      toast.error("Please sign in to upvote");
      return navigate("/auth");
    }
    if (voteLocks.current.has("post")) return;
    voteLocks.current.add("post");
    setPendingVotes(new Set(voteLocks.current));
    const was = upvoted;
    setUpvoted(!was);
    setUpvoteCount((c) => Math.max(0, c + (was ? -1 : 1)));
    try {
    const { error } = was
      ? await supabase.from("community_upvotes").delete().eq("user_id", user.id).eq("post_id", id!)
      : await supabase.from("community_upvotes").insert({ user_id: user.id, post_id: id });
    if (error) throw error;
    } catch {
      setUpvoted(was);
      setUpvoteCount((c) => Math.max(0, c + (was ? 1 : -1)));
      toast.error("Could not update your vote");
    } finally { voteLocks.current.delete("post"); setPendingVotes(new Set(voteLocks.current)); }
  };

  const toggleCommentUpvote = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to upvote");
      return navigate("/auth");
    }
    if (voteLocks.current.has(commentId)) return;
    voteLocks.current.add(commentId);
    setPendingVotes(new Set(voteLocks.current));
    const was = commentUpvotes.has(commentId);
    setCommentUpvotes((prev) => {
      const n = new Set(prev);
      if (was) n.delete(commentId); else n.add(commentId);
      return n;
    });
    setCommentUpvoteCounts((prev) => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) + (was ? -1 : 1)) }));

    try {
    const { error } = was
      ? await supabase.from("community_upvotes").delete().eq("user_id", user.id).eq("comment_id", commentId)
      : await supabase.from("community_upvotes").insert({ user_id: user.id, comment_id: commentId });

    if (error) throw error;
    } catch {
      setCommentUpvotes((prev) => {
        const n = new Set(prev);
        if (was) n.add(commentId); else n.delete(commentId);
        return n;
      });
      setCommentUpvoteCounts((prev) => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) + (was ? 1 : -1)) }));
      toast.error("Could not update your vote");
    } finally { voteLocks.current.delete(commentId); setPendingVotes(new Set(voteLocks.current)); }
  };

  const saveComment = async (content: string, parentId?: string) => {
    if (!user) return navigate("/auth");
    if (!content.trim()) { toast.error("Write something first"); return; }
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("community_comments").insert({
        post_id: id!, user_id: user.id, content: content.trim(), ...(parentId ? { parent_id: parentId } : {}),
      });
      if (error) throw error;
      if (parentId) { setReplyTo(null); setReplyContent(""); } else setComment("");
      try { await loadComments(id!); }
      catch { setLoadError(true); toast.error("Comment saved, but the discussion could not refresh. Reload it before posting again."); }
    } catch { toast.error("Could not save your comment. Check your connection."); }
    finally { submitLock.current = false; setSubmitting(false); }
  };
  const handleComment = (event: React.FormEvent) => { event.preventDefault(); void saveComment(comment); };
  const handleReply = (parentId: string) => saveComment(replyContent, parentId);

  const deleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
    const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
    if (error) toast.error(error.message);
    else {
      toast.success("Comment deleted");
      await loadComments(id!).catch(() => setLoadError(true));
    }
    } catch { toast.error("Could not complete the deletion. Check your connection and retry."); }
  };

  const deletePost = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
    const { error } = await supabase.from("community_posts").delete().eq("id", id!);
    if (error) toast.error(error.message);
    else {
      toast.success("Post deleted");
      navigate("/community");
    }
    } catch { toast.error("Could not complete the deletion. Check your connection and retry."); }
  };

  const getInitials = (name: string | null) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

  if (loading) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );

  if (loadError) return <div className="min-h-screen"><Header /><main role="alert" className="p-8">Could not load the discussion. <Button variant="outline" onClick={() => setRevision(r => r + 1)}>Retry discussion</Button></main><Footer /></div>;

  if (!post) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This post no longer exists.</p>
        <Button variant="outline" onClick={() => navigate("/community")}>Back to Community</Button>
      </div>
      <Footer />
    </div>
  );

  const renderComment = (c: Comment, depth = 0) => (
    <div key={c.id} className={depth > 0 ? "ml-4 md:ml-8 border-l-2 border-border pl-3 md:pl-4" : ""}>
      <div className="flex gap-3 py-4">
        <Avatar className="h-8 w-8 shrink-0">
          {c.profiles?.avatar_url && <AvatarImage src={c.profiles.avatar_url} alt={c.profiles.full_name || "User"} />}
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
            {(user?.id === c.user_id || isAdmin) && (
              <button
                type="button"
                onClick={() => deleteComment(c.id)}
                className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{c.content}</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={pendingVotes.has(c.id)} onClick={() => toggleCommentUpvote(c.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${commentUpvotes.has(c.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowBigUp className={`h-4 w-4 ${commentUpvotes.has(c.id) ? "fill-primary" : ""}`} />
              {commentUpvoteCounts[c.id] || 0}
            </button>
            {depth < 3 && (
              <button
                type="button"
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
              <Button aria-label="Send reply" size="sm" onClick={() => handleReply(c.id)} disabled={submitting} className="bg-gradient-primary text-primary-foreground shrink-0">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>
      {c.replies.map((r) => renderComment(r, depth + 1))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/community" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>

        {/* Post */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <button type="button" aria-label="Upvote post" disabled={pendingVotes.has("post")} onClick={togglePostUpvote} className={`rounded-md p-1 transition-colors ${upvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <ArrowBigUp className={`h-7 w-7 ${upvoted ? "fill-primary" : ""}`} />
              </button>
              <span className={`text-sm font-semibold ${upvoted ? "text-primary" : "text-muted-foreground"}`}>{upvoteCount}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {post.is_pinned && <Pin className="h-3.5 w-3.5 text-warning fill-warning" />}
                <Badge variant="outline" className={`text-xs ${categoryColors[post.category] || ""}`}>
                  {CATEGORY_LABELS[post.category] || post.category}
                </Badge>
                {(user?.id === post.user_id || isAdmin) && (
                  <Button variant="ghost" size="sm" onClick={deletePost} className="ml-auto text-muted-foreground hover:text-destructive gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-3 break-words">{post.title}</h1>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
              <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} alt={post.profiles.full_name || "User"} />}
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(post.profiles?.full_name ?? null)}
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
          <h2 className="text-lg font-semibold mb-4">{countComments(comments)} Comments</h2>

          {user ? (
            <form onSubmit={handleComment} className="mb-6 flex gap-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                required
              />
              <Button aria-label="Post comment" type="submit" disabled={submitting} className="bg-gradient-primary text-primary-foreground shrink-0 self-end">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          ) : (
            <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the discussion.
            </div>
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

export default function CommunityPost() {
  const { id } = useParams();
  return <CommunityPostContent key={id} />;
}
