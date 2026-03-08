import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, MessageSquare, Mic, MicOff, Monitor,
  Video, VideoOff, Users, PhoneOff,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTeacherBroadcast, useStudentViewer } from "@/hooks/useWebRTCBroadcast";

const LiveClass = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const [liveClass, setLiveClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const studentVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

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

  const isTeacher = user?.id === liveClass?.teacher_id;

  const teacher = useTeacherBroadcast(roomName || "", user?.id || "");
  const student = useStudentViewer(roomName || "", user?.id || "");

  // Attach teacher local stream to video element
  useEffect(() => {
    if (teacherVideoRef.current && teacher.localStream) {
      teacherVideoRef.current.srcObject = teacher.localStream;
    }
  }, [teacher.localStream]);

  // Attach screen share stream
  useEffect(() => {
    if (screenVideoRef.current && teacher.screenStream) {
      screenVideoRef.current.srcObject = teacher.screenStream;
    }
  }, [teacher.screenStream]);

  // Attach student remote stream
  useEffect(() => {
    if (studentVideoRef.current && student.remoteStream) {
      studentVideoRef.current.srcObject = student.remoteStream;
    }
  }, [student.remoteStream]);

  const handleStart = async () => {
    try {
      if (isTeacher) {
        await teacher.startBroadcast();
        await supabase.from("live_classes").update({ status: "live" }).eq("id", liveClass.id);
        toast.success("You're now live!");
      } else {
        student.joinBroadcast();
        toast.success("Connecting to class...");
      }
    } catch (err: any) {
      toast.error("Could not access camera/microphone. Please allow permissions.");
    }
  };

  const handleStop = () => {
    if (isTeacher) {
      teacher.stopBroadcast();
      supabase.from("live_classes").update({ status: "completed" }).eq("id", liveClass.id);
      toast.info("Broadcast ended.");
    } else {
      student.leaveBroadcast();
    }
  };

  const isActive = isTeacher ? teacher.isLive : student.connected || student.connecting;

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

  const scheduledTime = new Date(liveClass.scheduled_at);
  const isUpcoming = scheduledTime > new Date();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold">{liveClass.title}</h1>
                <Badge
                  variant={isActive ? "default" : isUpcoming ? "secondary" : "outline"}
                  className={isActive ? "bg-green-600 text-white animate-pulse" : ""}
                >
                  {isActive ? "● Live" : isUpcoming ? "Upcoming" : liveClass.status}
                </Badge>
                {isTeacher && teacher.isLive && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" /> {teacher.viewerCount}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {liveClass.courses?.title} • {format(scheduledTime, "MMM d, yyyy 'at' h:mm a")}
                {liveClass.duration_minutes && ` • ${liveClass.duration_minutes} min`}
              </p>
            </div>
          </div>

          {/* Controls */}
          {isActive && (
            <div className="flex items-center gap-2">
              {isTeacher && (
                <>
                  <Button
                    variant={teacher.isMuted ? "destructive" : "outline"}
                    size="icon"
                    onClick={teacher.toggleMute}
                    title={teacher.isMuted ? "Unmute" : "Mute"}
                  >
                    {teacher.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant={teacher.isCamOff ? "destructive" : "outline"}
                    size="icon"
                    onClick={teacher.toggleCamera}
                    title={teacher.isCamOff ? "Turn on camera" : "Turn off camera"}
                  >
                    {teacher.isCamOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant={teacher.screenStream ? "default" : "outline"}
                    size="icon"
                    onClick={teacher.shareScreen}
                    title="Share screen"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="destructive" onClick={handleStop} className="gap-2">
                <PhoneOff className="h-4 w-4" /> {isTeacher ? "End Class" : "Leave"}
              </Button>
            </div>
          )}
        </div>

        {/* Pre-join */}
        {!isActive && (
          <div className="flex flex-1 items-center justify-center flex-col gap-6 p-8">
            <div className="rounded-full bg-primary/10 p-8">
              <Video className="h-16 w-16 text-primary" />
            </div>
            <div className="text-center max-w-lg">
              <h2 className="text-2xl font-bold mb-2">
                {isTeacher ? "Ready to broadcast?" : "Ready to watch?"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {liveClass.description || (isTeacher
                  ? "Your camera and mic will be shared with all students."
                  : "You'll watch the teacher's live video and screen share.")}
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
              </div>
            </div>
            {!user && <p className="text-sm text-destructive">Please sign in to join the class.</p>}
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2 px-8 shadow-glow"
              disabled={!user}
            >
              <Video className="h-5 w-5" /> {isTeacher ? "Go Live" : "Join Stream"}
            </Button>
          </div>
        )}

        {/* Live view */}
        {isActive && (
          <div className="flex-1 flex flex-col items-center justify-center bg-black relative">
            {/* Teacher view: local camera preview */}
            {isTeacher && (
              <>
                {teacher.screenStream ? (
                  <>
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                      style={{ maxHeight: "calc(100vh - 120px)" }}
                    />
                    {/* Small camera PiP */}
                    <video
                      ref={teacherVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-primary object-cover shadow-lg"
                    />
                  </>
                ) : (
                  <video
                    ref={teacherVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                    style={{ maxHeight: "calc(100vh - 120px)" }}
                  />
                )}
              </>
            )}

            {/* Student view: remote stream */}
            {!isTeacher && (
              <>
                {student.connecting && !student.connected && (
                  <div className="flex flex-col items-center gap-3 text-white">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p>Connecting to broadcast...</p>
                    <p className="text-sm text-white/60">Waiting for teacher to go live</p>
                  </div>
                )}
                {student.connected && (
                  <video
                    ref={studentVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                    style={{ maxHeight: "calc(100vh - 120px)" }}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveClass;
