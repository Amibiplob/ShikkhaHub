import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileEditor from "@/components/ProfileEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, BookOpen, Trophy, Award, Calendar } from "lucide-react";
import { format } from "date-fns";

const Profile = () => {
  const { user, profile, loading: authLoading, roles } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ enrolled: 0, completed: 0, certificates: 0, badges: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [enrollRes, certRes, badgeRes] = await Promise.all([
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({
        enrolled: enrollRes.count || 0,
        completed: 0,
        certificates: certRes.count || 0,
        badges: badgeRes.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  const initials = (profile?.full_name || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="rounded-xl border border-border bg-card p-8 text-center mb-8">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold mb-1">{profile?.full_name || "Unnamed User"}</h1>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mb-2">
              <Mail className="h-3.5 w-3.5" /> {user?.email}
            </p>
            {profile?.bio && (
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">{profile.bio}</p>
            )}
            <div className="flex items-center justify-center gap-2 mb-4">
              {roles.map((role) => (
                <Badge key={role} variant="outline" className="capitalize">{role}</Badge>
              ))}
            </div>
            {user?.created_at && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Calendar className="h-3 w-3" /> Joined {format(new Date(user.created_at), "MMMM yyyy")}
              </p>
            )}
            <div className="mt-4">
              <ProfileEditor onUpdated={() => window.location.reload()} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <BookOpen className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{stats.enrolled}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <Trophy className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{stats.certificates}</p>
              <p className="text-xs text-muted-foreground">Certificates</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <Award className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{stats.badges}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
