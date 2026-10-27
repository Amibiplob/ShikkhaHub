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
import { sortPopular, paginate } from "@/features/community/communitySort";

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
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);


  const updateListParam = (key: "category" | "sort", value: string) => {
    const params = new URLSearchParams(searchParams);
    if ((key === "category" && value === "all") || (key === "sort" && value === "newest")) params.delete(key);
    else params.set(key, value);
    setPage(0);
    setSearchParams(params, { replace: true });
  };

  const fetchCounts = async (postIds: string[]) => {
    if (postIds.length === 0) {
      setUpvoteCounts({});
      setCommentCounts({});
      return;
    }

    const [upvotes, comments] = await Promise.all([
      supabase.from("community_upvotes").select("post_id").in("post_id", postIds),
      supabase.from("community_comments").select("post_id").in("post_id", postIds),
    ]);

    const uCounts: Record<string, number> = {};
    upvotes.data?.forEach((u) => { if (u.post_id) uCounts[u.post_id] = (uCounts[u.post_id] || 0) + 1; });
    setUpvoteCounts(uCounts);

    const cCounts: Record<string, number> = {};
    comments.data?.forEach((c) => { if (c.post_id) cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1; });
    setCommentCounts(cCounts);
  };

  const requestId = useRef(0);

  const fetchPosts = useCallback(async () => {
    const myId = ++requestId.current;
    const isStale = () => myId !== requestId.current;
    setLoading(true);
    const select = "*, profiles!community_posts_user_id_profiles_fkey(full_name, avatar_url)";

    const applyFilters = (q) => {
      if (category !== "all") q = q.eq("category", category);
      if (search) q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      return q;
    };

    if (sortBy === "popular") {
      // Popular needs upvote counts across all matching posts, so sort in memory.
      const { data, error } = await applyFilters(supabase.from("community_posts").select(select));
      if (isStale()) return;
      if (error) {
        toast.error("Could not load posts");
        setPosts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      const all: Post[] = data || [];
      const ids = all.map((p) => p.id);
      const { data: ups } = ids.length
        ? await supabase.from("community_upvotes").select("post_id").in("post_id", ids)
        : { data: [] as { post_id: string }[] };
      if (isStale()) return;
      const counts: Record<string, number> = {};
      ups?.forEach((u) => { if (u.post_id) counts[u.post_id] = (counts[u.post_id] || 0) + 1; });
      const sorted = sortPopular(all, counts);
      setTotalCount(sorted.length);
      setPosts(paginate(sorted, page, POSTS_PER_PAGE));
      setLoading(false);
      return;
    }

    let query = applyFilters(
      supabase.from("community_posts").select(select, { count: "exact" }).order("is_pinned", { ascending: false })
    ).order("created_at", { ascending: sortBy === "oldest" });

    query = query.range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);

    const { data, count, error } = await query;
    if (isStale()) return;
    if (error) toast.error("Could not load posts");
    setPosts(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [category, search, sortBy, page]);

  useEffect(() => {
    void (async () => { await fetchPosts(); })();
  }, [fetchPosts]);

  const fetchUpvotes = useCallback(async () => {
    if (!user) {
      setUpvotedPosts(new Set());
      return;
    }
    const { data } = await supabase
      .from("community_upvotes")
      .select("post_id")
      .eq("user_id", user.id)
      .not("post_id", "is", null);
    setUpvotedPosts(new Set(data?.map((u) => u.post_id!).filter(Boolean) || []));
  }, [user]);

  useEffect(() => {
    void (async () => { await fetchUpvotes(); })();
  }, [fetchUpvotes]);


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    if (posts.length) void (async () => { await fetchCounts(posts.map((p) => p.id)); })();
  }, [posts]);

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
    setCreating(true);
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
    setCreating(false);
  };

  const toggleUpvote = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to upvote");
      return navigate("/auth");
    }
    const wasUpvoted = upvotedPosts.has(postId);
    // Optimistic update
    setUpvotedPosts((prev) => {
      const n = new Set(prev);
      if (wasUpvoted) n.delete(postId); else n.add(postId);
      return n;
    });
    setUpvoteCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (wasUpvoted ? -1 : 1)) }));

    const { error } = wasUpvoted
      ? await supabase.from("community_upvotes").delete().eq("user_id", user.id).eq("post_id", postId)
      : await supabase.from("community_upvotes").insert({ user_id: user.id, post_id: postId });

    if (error) {
      // Revert
      setUpvotedPosts((prev) => {
        const n = new Set(prev);
        if (wasUpvoted) n.add(postId); else n.delete(postId);
        return n;
      });
      setUpvoteCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (wasUpvoted ? 1 : -1)) }));
      toast.error("Could not update your vote");
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    if (error) toast.error(error.message);
    else {
      toast.success("Post deleted");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotalCount((c) => Math.max(0, c - 1));
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
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
                <Input placeholder="Search posts..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" />
              </div>
              <Select value={sortBy} onValueChange={(v: "newest" | "oldest" | "popular") => updateListParam("sort", v)}>
                <SelectTrigger className="w-[140px]">
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
