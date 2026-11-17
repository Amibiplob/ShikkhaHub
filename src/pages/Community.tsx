import type { Post } from "@/types/models";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowBigUp, ChevronLeft, ChevronRight, Loader2, MessageSquare, Pin, Plus, Search, SortAsc, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";


const CATEGORIES = [
  { value: "all", label: "All Topics" },
  { value: "programming", label: "Programming" },
  { value: "career", label: "Career" },
  { value: "hardware", label: "Hardware" },
  { value: "ai", label: "AI / New Technology" },
  { value: "general", label: "General Discussion" },
];

const categoryColors: Record<string, string> = {
  programming: "bg-primary/10 text-primary border-primary/20",
  career: "bg-accent/10 text-accent border-accent/20",
  hardware: "bg-warning/10 text-warning border-warning/20",
  ai: "bg-info/10 text-info border-info/20",
  general: "bg-muted text-muted-foreground border-border",
};

const POSTS_PER_PAGE = 10;

const Community = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());
  const voteLocks = useRef(new Set<string>());
  const createLock = useRef(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const category = searchParams.get("category") || "all";
  const requestedSort = searchParams.get("sort");
  const sortBy = requestedSort === "oldest" || requestedSort === "popular" ? requestedSort : "newest";
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [upvotedPosts, setUpvotedPosts] = useState<Set<string>>(new Set());
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  // Create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postCategory, setPostCategory] = useState("general");

  const isAdmin = hasRole("admin");

  // Debounce the search box so we don't fire a query per keystroke
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput, search]);


  const updateListParam = (key: "category" | "sort", value: string) => {
    const params = new URLSearchParams(searchParams);
    if ((key === "category" && value === "all") || (key === "sort" && value === "newest")) params.delete(key);
    else params.set(key, value);
    setPage(0);
    setSearchParams(params, { replace: true });
  };

  const requestId = useRef(0);
  const fetchPosts = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("community_feed", {
        search_text: search, topic: category, ordering: sortBy,
        page_number: page, page_size: POSTS_PER_PAGE,
      });
      if (error) throw error;
      if (request !== requestId.current) return;
      const feed = data as unknown as { rows: (Post & { upvote_count: number; comment_count: number; viewer_upvoted: boolean })[]; total: number };
      if (!feed || !Array.isArray(feed.rows) || !Number.isFinite(feed.total)) throw new Error("Invalid feed");
      const lastPage = Math.max(0, Math.ceil(feed.total / POSTS_PER_PAGE) - 1);
      if (page > lastPage) { setPage(lastPage); return; }
      setPosts(feed.rows);
      setTotalCount(feed.total);
      setUpvoteCounts(Object.fromEntries(feed.rows.map(p => [p.id, p.upvote_count])));
      setCommentCounts(Object.fromEntries(feed.rows.map(p => [p.id, p.comment_count])));
      setUpvotedPosts(new Set(feed.rows.filter(p => p.viewer_upvoted).map(p => p.id)));
      setLoadError(false);
    } catch {
      if (request === requestId.current) setLoadError(true);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [category, search, sortBy, page, setPage]);

  useEffect(() => {
    const request = requestId;
    void (async () => { await fetchPosts(); })();
    return () => { request.current++; };
  }, [fetchPosts]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const openCreate = () => {
    if (!user) {
      toast.error("Please sign in to create a post");
      navigate("/auth");
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate("/auth");
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    if (createLock.current) return;
    createLock.current = true;
    setCreating(true);
    try {
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category: postCategory,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Post created!");
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setPostCategory("general");
      if (page !== 0) setPage(0);
      else fetchPosts();
    }
    } catch { toast.error("Could not create the post. Please retry."); }
    finally { createLock.current = false; setCreating(false); }
  };

  const toggleUpvote = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to upvote");
      return navigate("/auth");
    }
    if (voteLocks.current.has(postId)) return;
    voteLocks.current.add(postId);
    setPendingVotes(new Set(voteLocks.current));
    try {
      const { error } = upvotedPosts.has(postId)
        ? await supabase.from("community_upvotes").delete().eq("user_id", user.id).eq("post_id", postId)
        : await supabase.from("community_upvotes").insert({ user_id: user.id, post_id: postId });
      if (error) throw error;
      await fetchPosts();
    } catch { toast.error("Could not update your vote"); }
    finally { voteLocks.current.delete(postId); setPendingVotes(new Set(voteLocks.current)); }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    if (error) toast.error(error.message);
    else {
      toast.success("Post deleted");
      await fetchPosts();
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="border-b border-border bg-gradient-hero py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="mb-2 text-3xl font-bold md:text-4xl">Community</h1>
                <p className="text-muted-foreground">Discuss, learn, and share with fellow developers</p>
              </div>
              <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                <Plus className="h-4 w-4" /> New Post
              </Button>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Post</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <Label htmlFor="community-field-1">Title</Label>
                      <Input id="community-field-1" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="What's on your mind?" />
                    </div>
                    <div>
                      <Label htmlFor="community-select-3">Category</Label>
                      <Select value={postCategory} onValueChange={setPostCategory}>
                        <SelectTrigger id="community-select-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="community-field-2">Content</Label>
                      <Textarea id="community-field-2" value={content} onChange={(e) => setContent(e.target.value)} required rows={6} placeholder="Share your thoughts, questions, or ideas..." />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={creating}>
                      {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search posts" maxLength={200} placeholder="Search posts..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" />
              </div>
              <Select value={sortBy} onValueChange={(v: "newest" | "oldest" | "popular") => updateListParam("sort", v)}>
                <SelectTrigger aria-label="Sort posts" className="w-[140px]">
                  <SortAsc className="mr-2 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Button
                  key={c.value}
                  variant={category === c.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateListParam("category", c.value)}
                  className={category === c.value ? "bg-gradient-primary text-primary-foreground" : ""}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : loadError ? (
            <div role="alert" className="py-12 text-center">Could not load posts. Check your connection.
              <Button variant="outline" onClick={() => void fetchPosts()}>Retry posts</Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                {search || category !== "all"
                  ? "No posts match your search. Try another topic or keyword."
                  : "No posts yet. Be the first to start a discussion!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="flex gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20">
                  {/* Upvote */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      type="button"
                      aria-label="Upvote post"
                      aria-pressed={upvotedPosts.has(post.id)}
                      disabled={pendingVotes.has(post.id)}
                      onClick={() => toggleUpvote(post.id)}
                      className={`rounded-md p-1 transition-colors ${upvotedPosts.has(post.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <ArrowBigUp className={`h-6 w-6 ${upvotedPosts.has(post.id) ? "fill-primary" : ""}`} />
                    </button>
                    <span className={`text-sm font-medium ${upvotedPosts.has(post.id) ? "text-primary" : "text-muted-foreground"}`}>
                      {upvoteCounts[post.id] || 0}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {post.is_pinned && (
                        <Pin className="h-3.5 w-3.5 text-warning fill-warning" />
                      )}
                      <Badge variant="outline" className={`text-xs ${categoryColors[post.category] || ""}`}>
                        {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                      </Badge>
                      {(user?.id === post.user_id || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Link to={`/community/${post.id}`}>
                      <h3 className="text-lg font-semibold hover:text-primary transition-colors leading-snug break-words">
                        {post.title}
                      </h3>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground break-words">{post.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>by {post.profiles?.full_name || "Anonymous"}</span>
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      <Link to={`/community/${post.id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {commentCounts[post.id] || 0} comments
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCount > POSTS_PER_PAGE && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * POSTS_PER_PAGE >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
