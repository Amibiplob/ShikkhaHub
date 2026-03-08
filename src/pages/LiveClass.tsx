import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, MessageSquare, Mic, MicOff, Monitor, Send, Users, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const LiveClass = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const [liveClass, setLiveClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [participants, setParticipants] = useState(0);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!roomName) return;
    const fetchClass = async () => {
      const { data } = await supabase
        .from("live_classes")
        .select("*, courses(title)")
        .eq("room_name", roomName)
        .single();
      setLiveClass(data);
      setLoading(false);
    };
    fetchClass();
  }, [roomName]);

  const meetingUrl = roomName
    ? `https://meet.jit.si/CodeCampus_${roomName}#userInfo.displayName="${encodeURIComponent(profile?.full_name || user?.user_metadata?.full_name || user?.email || "Student")}"&config.startWithAudioMuted=true&config.prejoinPageEnabled=false`
    : "";

  const joinMeeting = () => {
    if (!user || !meetingUrl) return;

    // Update status to live if teacher
    if (liveClass && liveClass.teacher_id === user.id) {
      supabase.from("live_classes").update({ status: "live" }).eq("id", liveClass.id);
    }

    window.open(meetingUrl, "_blank", "noopener,noreferrer");
    setJoined(true);
    toast.success("Meeting opened in a new tab!");
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

  if (!liveClass) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center flex-col gap-4">
          <div className="rounded-full bg-destructive/10 p-6">
            <VideoOff className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Live class not found</h2>
          <p className="text-muted-foreground">This class may have been removed or the link is invalid.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.id === liveClass.teacher_id;
  const scheduledTime = new Date(liveClass.scheduled_at);
  const isUpcoming = scheduledTime > new Date();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {/* Info bar */}
        <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold">{liveClass.title}</h1>
                <Badge variant={joined ? "default" : isUpcoming ? "secondary" : "outline"} className={joined ? "bg-success text-success-foreground animate-pulse" : ""}>
                  {joined ? "● Live" : isUpcoming ? "Upcoming" : liveClass.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {liveClass.courses?.title} • {format(scheduledTime, "MMM d, yyyy 'at' h:mm a")}
                {liveClass.duration_minutes && ` • ${liveClass.duration_minutes} min`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {joined && (
              <Badge variant="outline" className="gap-1.5">
                <Users className="h-3 w-3" /> {participants + 1}
              </Badge>
            )}
            {!joined ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={joinMeeting}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2"
                  disabled={!user}
                >
                  <Video className="h-4 w-4" /> {isTeacher ? "Start Class" : "Join Class"}
                </Button>
                {meetingUrl && (
                  <Button variant="outline" asChild>
                    <a href={meetingUrl} target="_blank" rel="noopener noreferrer">Open in Browser</a>
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="destructive" onClick={leaveMeeting} className="gap-2">
                <VideoOff className="h-4 w-4" /> Leave
              </Button>
            )}
          </div>
        </div>

        {/* Main content */}
        {!joined && (
          <div className="flex flex-1 items-center justify-center flex-col gap-6 p-8">
            <div className="rounded-full bg-primary/10 p-8">
              <Video className="h-16 w-16 text-primary" />
            </div>
            <div className="text-center max-w-lg">
              <h2 className="text-2xl font-bold mb-2">
                {isTeacher ? "Ready to start your class?" : "Ready to join?"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {liveClass.description || "This live session includes video, audio, screen sharing, and chat."}
              </p>
              {isUpcoming && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Scheduled for <span className="font-medium text-foreground">{format(scheduledTime, "EEEE, MMMM d 'at' h:mm a")}</span>
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Video className="h-4 w-4" /> Video</span>
                <span className="flex items-center gap-1.5"><Mic className="h-4 w-4" /> Audio</span>
                <span className="flex items-center gap-1.5"><Monitor className="h-4 w-4" /> Screen Share</span>
                <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> Chat</span>
              </div>
            </div>
            {!user && (
              <p className="text-sm text-destructive">Please sign in to join the class.</p>
            )}
            <Button
              onClick={joinMeeting}
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2 px-8 shadow-glow"
              disabled={!user}
            >
              <Video className="h-5 w-5" /> {isTeacher ? "Start Class Now" : "Join Class Now"}
            </Button>
          </div>
        )}
        <div ref={jitsiContainerRef} className={joined ? "flex-1 min-h-[600px]" : "hidden"} />
      </main>
    </div>
  );
};

export default LiveClass;
