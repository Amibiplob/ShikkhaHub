import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Medal, Trophy } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  completedCourses: number;
  certificates: number;
  lessonsCompleted: number;
}

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (error) { setError(true); setEntries([]); }
      else { setError(false); setEntries(data || []); }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const medalColor = (index: number) => {
    if (index === 0) return "text-yellow-500";
    if (index === 1) return "text-gray-400";
    if (index === 2) return "text-amber-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {error && <p role="alert" className="mb-4 text-destructive">Could not load the leaderboard. Please try again later.</p>}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-7 w-7 text-primary" /> Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">Top learners ranked by course completions and lessons</p>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No activity yet. Start learning to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const initials = entry.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors ${i < 3 ? "border-primary/20" : ""}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center">
                    {i < 3 ? (
                      <Medal className={`h-6 w-6 ${medalColor(i)}`} />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    )}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{entry.full_name}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-primary">{entry.certificates}</p>
                      <p className="text-xs text-muted-foreground">Certificates</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{entry.lessonsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Lessons</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
