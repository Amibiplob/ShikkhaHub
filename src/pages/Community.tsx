import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowBigUp, ChevronLeft, ChevronRight, Loader2, MessageSquare, Pin, Plus, Search, SortAsc } from "lucide-react";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [upvotedPosts, setUpvotedPosts] = useState<Set<string>>(new Set());

  // Create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postCategory, setPostCategory] = useState("general");

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("community_posts")
      .select("*, profiles!community_posts_user_id_fkey(full_name, avatar_url)", { count: "exact" })
      .order("is_pinned", { ascending: false });

    if (sortBy === "newest" || sortBy === "popular") query = query.order("created_at", { ascending: false });
    if (sortBy === "oldest") query = query.order("created_at", { ascending: true });

    if (category !== "all") query = query.eq("category", category);
    if (search) query = query.ilike("title", `%${search}%`);

    query = query.range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);

    const { data, count } = await query;
    setPosts(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const fetchUpvotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("community_upvotes")
      .select("post_id")
      .eq("user_id", user.id)
      .not("post_id", "is", null);
    setUpvotedPosts(new Set(data?.map((u) => u.post_id!).filter(Boolean) || []));
  };

  // Fetch upvote counts
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const fetchCounts = async (postIds: string[]) => {
    if (postIds.length === 0) return;
    
    const [upvotes, comments] = await Promise.all([
      supabase.from("community_upvotes").select("post_id").in("post_id", postIds),
      supabase.from("community_comments").select("post_id").in("post_id", postIds),
    ]);

    const uCounts: Record<string, number> = {};
    upvotes.data?.forEach((u) => { if (u.post_id) uCounts[u.post_id] = (uCounts[u.post_id] || 0) + 1; });
    setUpvoteCounts(uCounts);

    const cCounts: Record<string, number> = {};
    comments.data?.forEach((c) => { cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1; });
    setCommentCounts(cCounts);
  };

  useEffect(() => {
    fetchPosts();
    fetchUpvotes();
  }, [category, search, user, sortBy, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [category, search, sortBy]);

  useEffect(() => {
    if (posts.length > 0) {
      fetchCounts(posts.map((p) => p.id));
    }
  }, [posts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate("/auth");
    setCreating(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      title,
      content,
      category: postCategory,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Post created!");
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setPostCategory("general");
      fetchPosts();
    }
    setCreating(false);
  };

  const toggleUpvote = async (postId: string) => {
    if (!user) return navigate("/auth");
    if (upvotedPosts.has(postId)) {
      await supabase.from("community_upvotes").delete().eq("user_id", user.id).eq("post_id", postId);
      setUpvotedPosts((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      setUpvoteCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 1) - 1 }));
    } else {
      await supabase.from("community_upvotes").insert({ user_id: user.id, post_id: postId });
      setUpvotedPosts((prev) => new Set(prev).add(postId));
      setUpvoteCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-border py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold md:text-4xl">Community</h1>
                <p className="text-muted-foreground">Discuss, learn, and share with fellow developers</p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                    <Plus className="h-4 w-4" /> New Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Post</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="What's on your mind?" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={postCategory} onValueChange={setPostCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Content</Label>
                      <Textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={6} placeholder="Share your thoughts, questions, or ideas..." />
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
                <Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
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
                  onClick={() => setCategory(c.value)}
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
              <p className="text-lg text-muted-foreground">No posts yet. Be the first to start a discussion!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="flex gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20">
                  {/* Upvote */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      onClick={(e) => { e.preventDefault(); toggleUpvote(post.id); }}
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
                    </div>
                    <Link to={`/community/${post.id}`}>
                      <h3 className="text-lg font-semibold hover:text-primary transition-colors leading-snug">
                        {post.title}
                      </h3>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
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
                onClick={() => setPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(totalCount / POSTS_PER_PAGE)}
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
