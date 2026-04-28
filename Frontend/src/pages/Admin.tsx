import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BarChart3, BookOpen, Flag, Loader2, MessageSquare, Shield, Trash2, Users, Video,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Admin = () => {
  const { user, loading: authLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Data
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchCourses, setSearchCourses] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !hasRole("admin"))) {
      navigate("/dashboard");
    }
  }, [authLoading, user, hasRole, navigate]);

  useEffect(() => {
    if (!user || !hasRole("admin")) return;
    const fetchAll = async () => {
      const [profilesRes, rolesRes, coursesRes, postsRes, enrollRes, liveRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("courses").select("*, profiles!courses_teacher_id_profiles_fkey(full_name)").order("created_at", { ascending: false }),
        supabase.from("community_posts").select("*, profiles!community_posts_user_id_fkey(full_name)").order("created_at", { ascending: false }),
        supabase.from("enrollments").select("*, courses(title)"),
        supabase.from("live_classes").select("*, courses(title)").order("scheduled_at", { ascending: false }),
      ]);
      setProfiles(profilesRes.data || []);
      setRoles(rolesRes.data || []);
      setCourses(coursesRes.data || []);
      setPosts(postsRes.data || []);
      setEnrollments(enrollRes.data || []);
      setLiveClasses(liveRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [user, hasRole]);

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast.success("Course deleted");
    }
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Post deleted");
    }
  };

  const togglePin = async (id: string, current: boolean) => {
    const { error } = await supabase.from("community_posts").update({ is_pinned: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, is_pinned: !current } : p)));
      toast.success(current ? "Unpinned" : "Pinned");
    }
  };

  const addRole = async (userId: string, role: "admin" | "teacher" | "student") => {
    const { data, error } = await supabase.from("user_roles").insert([{ user_id: userId, role }]).select().single();
    if (error) toast.error(error.message);
    else {
      setRoles((prev) => [...prev, data]);
      toast.success(`Role "${role}" added`);
    }
  };

  const removeRole = async (userId: string, role: "admin" | "teacher" | "student") => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) toast.error(error.message);
    else {
      setRoles((prev) => prev.filter((r) => !(r.user_id === userId && r.role === role)));
      toast.success(`Role "${role}" removed`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const filteredProfiles = profiles.filter(
    (p) => !searchUsers || p.full_name?.toLowerCase().includes(searchUsers.toLowerCase()) || p.user_id.includes(searchUsers)
  );

  const filteredCourses = courses.filter(
    (c) => !searchCourses || c.title.toLowerCase().includes(searchCourses.toLowerCase())
  );

  const reportedPosts = posts.filter((p) => p.is_reported);

  // Stats
  const totalUsers = profiles.length;
  const totalTeachers = new Set(roles.filter((r) => r.role === "teacher").map((r) => r.user_id)).size;
  const totalStudents = new Set(roles.filter((r) => r.role === "student").map((r) => r.user_id)).size;
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.is_published).length;
  const totalEnrollments = enrollments.length;
  const totalPosts = posts.length;
  const totalLiveClasses = liveClasses.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage your platform</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Users" value={totalUsers} />
          <StatCard icon={BookOpen} label="Courses" value={`${publishedCourses} / ${totalCourses}`} sub="published / total" />
          <StatCard icon={BarChart3} label="Enrollments" value={totalEnrollments} />
          <StatCard icon={MessageSquare} label="Posts" value={totalPosts} />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatCard icon={Users} label="Teachers" value={totalTeachers} small />
          <StatCard icon={Users} label="Students" value={totalStudents} small />
          <StatCard icon={Video} label="Live Classes" value={totalLiveClasses} small />
          <StatCard icon={Flag} label="Reported Posts" value={reportedPosts.length} small accent={reportedPosts.length > 0} />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users"><Users className="mr-1.5 h-3.5 w-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="courses"><BookOpen className="mr-1.5 h-3.5 w-3.5" /> Courses</TabsTrigger>
            <TabsTrigger value="community"><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Community</TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users">
            <Input placeholder="Search by name or ID..." value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} className="mb-4 max-w-sm" />
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((p) => {
                    const userRoles = getUserRoles(p.user_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.user_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userRoles.map((r) => (
                              <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">
                                {r}
                              </Badge>
                            ))}
                            {userRoles.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(p.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!userRoles.includes("teacher") && (
                              <Button size="sm" variant="outline" onClick={() => addRole(p.user_id, "teacher")}>
                                + Teacher
                              </Button>
                            )}
                            {userRoles.includes("teacher") && (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeRole(p.user_id, "teacher")}>
                                − Teacher
                              </Button>
                            )}
                            {!userRoles.includes("admin") && (
                              <Button size="sm" variant="outline" onClick={() => addRole(p.user_id, "admin")}>
                                + Admin
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* COURSES TAB */}
          <TabsContent value="courses">
            <Input placeholder="Search courses..." value={searchCourses} onChange={(e) => setSearchCourses(e.target.value)} className="mb-4 max-w-sm" />
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((c) => {
                    const studentCount = enrollments.filter((e) => e.course_id === c.id).length;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.profiles?.full_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={c.is_published ? "default" : "secondary"}>
                            {c.is_published ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell>{studentCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete course?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{c.title}" and all its modules, lessons, and enrollments.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCourse(c.id)} className="bg-destructive text-destructive-foreground">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* COMMUNITY TAB */}
          <TabsContent value="community">
            {reportedPosts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Flag className="h-4 w-4 text-destructive" /> Reported Posts
                </h3>
                <div className="space-y-2">
                  {reportedPosts.map((p) => (
                    <PostRow key={p.id} post={p} onDelete={deletePost} onPin={togglePin} />
                  ))}
                </div>
              </div>
            )}
            <h3 className="text-lg font-semibold mb-3">All Posts</h3>
            <div className="space-y-2">
              {posts.map((p) => (
                <PostRow key={p.id} post={p} onDelete={deletePost} onPin={togglePin} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, small, accent }: any) => (
  <div className={`rounded-xl border border-border bg-card ${small ? "p-3" : "p-5"}`}>
    <Icon className={`mb-1.5 ${small ? "h-4 w-4" : "h-5 w-5"} ${accent ? "text-destructive" : "text-primary"}`} />
    <p className={`${small ? "text-xl" : "text-2xl"} font-bold`}>{value}</p>
    <p className={`text-${small ? "xs" : "sm"} text-muted-foreground`}>{sub || label}</p>
  </div>
);

const PostRow = ({ post, onDelete, onPin }: { post: any; onDelete: (id: string) => void; onPin: (id: string, current: boolean) => void }) => (
  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-medium truncate">{post.title}</p>
        {post.is_pinned && <Badge variant="outline" className="text-xs">Pinned</Badge>}
        {post.is_reported && <Badge variant="destructive" className="text-xs">Reported</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">
        {post.profiles?.full_name || "Unknown"} • {post.category} • {format(new Date(post.created_at), "MMM d, yyyy")}
      </p>
    </div>
    <div className="flex items-center gap-1 ml-2">
      <Button size="sm" variant="ghost" onClick={() => onPin(post.id, !!post.is_pinned)}>
        {post.is_pinned ? "Unpin" : "Pin"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" className="text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this post and all its comments.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(post.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
);

export default Admin;
