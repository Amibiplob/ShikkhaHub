import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Video, VideoOff } from "lucide-react";

const LiveClass = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [liveClass, setLiveClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

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

  const joinMeeting = () => {
    if (!jitsiContainerRef.current || !roomName || !user) return;

    const domain = "meet.jit.si";
    const options = {
      roomName: `CodeCampus_${roomName}`,
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName: user.user_metadata?.full_name || user.email || "Student",
        email: user.email || "",
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: "#0a0a0a",
        TOOLBAR_BUTTONS: [
          "microphone", "camera", "desktop", "chat",
          "raisehand", "participants-pane", "tileview",
          "fullscreen", "hangup",
        ],
      },
    };

    // Load Jitsi API script
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      apiRef.current = new (window as any).JitsiMeetExternalAPI(domain, options);
      setJoined(true);
    };
    document.head.appendChild(script);

    return () => {
      apiRef.current?.dispose();
      script.remove();
    };
  };

  const leaveMeeting = () => {
    apiRef.current?.dispose();
    apiRef.current = null;
    setJoined(false);
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
          <p className="text-muted-foreground">Live class not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {/* Info bar */}
        <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold">{liveClass.title}</h1>
              <p className="text-xs text-muted-foreground">
                {liveClass.courses?.title} • {new Date(liveClass.scheduled_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!joined ? (
              <Button
                onClick={joinMeeting}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2"
                disabled={!user}
              >
                <Video className="h-4 w-4" /> Join Class
              </Button>
            ) : (
              <Button variant="destructive" onClick={leaveMeeting} className="gap-2">
                <VideoOff className="h-4 w-4" /> Leave
              </Button>
            )}
          </div>
        </div>

        {/* Jitsi container */}
        {!joined ? (
          <div className="flex flex-1 items-center justify-center flex-col gap-4">
            <div className="rounded-full bg-primary/10 p-6">
              <Video className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Ready to join?</h2>
            <p className="text-muted-foreground text-center max-w-md">
              {liveClass.description || "Click 'Join Class' to enter the live session with video, audio, screen sharing, and chat."}
            </p>
            {!user && (
              <p className="text-sm text-destructive">Please sign in to join the class.</p>
            )}
          </div>
        ) : (
          <div ref={jitsiContainerRef} className="flex-1 min-h-[500px]" />
        )}
      </main>
    </div>
  );
};

export default LiveClass;
