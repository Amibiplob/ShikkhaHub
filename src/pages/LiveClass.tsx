import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Loader2, Mic, MicOff, Monitor, Video, VideoOff,
  Users, PhoneOff, Send, Hand, Camera, ScreenShare,
  AudioLines, MessageSquare, Circle, Square, Upload, Film,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTeacherBroadcast, useStudentViewer, type ChatMessage } from "@/hooks/useWebRTCBroadcast";

const LiveClass = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const [liveClass, setLiveClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [entryModalOpen, setEntryModalOpen] = useState(true);

  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const studentVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

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

  const teacher = useTeacherBroadcast(roomName || "", user?.id || "", displayName);
  const student = useStudentViewer(roomName || "", user?.id || "", displayName);

  const chatMessages = isTeacher ? teacher.chatMessages : student.chatMessages;
  const sendChat = isTeacher ? teacher.sendChat : student.sendChat;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Attach teacher local stream
  useEffect(() => {
    if (teacherVideoRef.current && teacher.localStream) {
      teacherVideoRef.current.srcObject = teacher.localStream;
    }
  }, [teacher.localStream]);

  // Attach screen share
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

  const handleStartCamera = async () => {
    try {
      await teacher.startBroadcast("camera");
      await supabase.from("live_classes").update({ status: "live" }).eq("id", liveClass.id);
      toast.success("You're now live with camera!");
    } catch {
      toast.error("Camera unavailable. Try screen share or audio-only.");
    }
  };

  const handleStartScreen = async () => {
    try {
      await teacher.startBroadcast("screen");
      await supabase.from("live_classes").update({ status: "live" }).eq("id", liveClass.id);
      toast.success("You're now live with screen share!");
    } catch {
      toast.error("Could not start screen share.");
    }
  };

  const handleStartAudio = async () => {
    try {
      await teacher.startBroadcast("audio-only");
      await supabase.from("live_classes").update({ status: "live" }).eq("id", liveClass.id);
      toast.success("You're now live with audio!");
    } catch {
      toast.error("Could not access microphone.");
    }
  };

  const handleStudentJoin = () => {
    student.joinBroadcast();
    toast.success("Connecting to class...");
  };

  const [uploading, setUploading] = useState(false);

  const handleStop = async () => {
    if (isTeacher) {
      // If recording, stop and upload first
      if (teacher.isRecording) {
        await handleStopRecordingAndUpload();
      }
      teacher.stopBroadcast();
      await supabase.from("live_classes").update({ status: "expired" }).eq("id", liveClass.id);
      setLiveClass((prev: any) => (prev ? { ...prev, status: "expired" } : prev));
      toast.info("Meeting ended and marked as expired.");
    } else {
      student.leaveBroadcast();
    }
  };

  const handleStartRecording = () => {
    teacher.startRecording();
    toast.success("Recording started!");
  };

  const handleStopRecordingAndUpload = async () => {
    setUploading(true);
    try {
      const blob = await teacher.stopRecording();
      const fileName = `${user!.id}/${roomName}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("class-recordings")
        .upload(fileName, blob, { contentType: "video/webm" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("class-recordings")
        .getPublicUrl(fileName);

      await supabase.from("class_recordings").insert({
        live_class_id: liveClass.id,
        teacher_id: user!.id,
        file_url: urlData.publicUrl,
        file_size: blob.size,
        duration_seconds: teacher.recordingDuration,
        title: `${liveClass.title} — ${format(new Date(), "MMM d, h:mm a")}`,
      });

      toast.success("Recording saved!");
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error("Failed to save recording.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput);
    setChatInput("");
  };

  const isActive = isTeacher ? teacher.isLive : student.connected || student.connecting;

  useEffect(() => {
    if (!liveClass) return;
    if (isActive || student.ended || liveClass.status === "expired" || liveClass.status === "completed") {
      setEntryModalOpen(false);
      return;
    }
    setEntryModalOpen(true);
  }, [isActive, student.ended, liveClass]);

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
  const isExpired = liveClass.status === "expired" || liveClass.status === "completed";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="border-b border-border bg-card px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm md:text-base">{liveClass.title}</h1>
                <Badge
                  variant={isActive ? "default" : isUpcoming ? "secondary" : liveClass.status === "expired" ? "destructive" : "outline"}
                  className={isActive ? "bg-green-600 text-white animate-pulse" : ""}
                >
                  {isActive ? "● Live" : isUpcoming ? "Upcoming" : liveClass.status === "expired" ? "Expired" : liveClass.status}
                </Badge>
                {isTeacher && teacher.isLive && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" /> {teacher.viewerCount}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {liveClass.courses?.title} • {format(scheduledTime, "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>

          {isActive && (
            <div className="flex items-center gap-1.5">
              {isTeacher && (
                <>
                  <Button variant={teacher.isMuted ? "destructive" : "outline"} size="icon" onClick={teacher.toggleMute} title={teacher.isMuted ? "Unmute" : "Mute"}>
                    {teacher.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button variant={teacher.isCamOff ? "destructive" : "outline"} size="icon" onClick={teacher.toggleCamera} title={teacher.isCamOff ? "Camera on" : "Camera off"}>
                    {teacher.isCamOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </Button>
                  <Button variant={teacher.screenStream ? "default" : "outline"} size="icon" onClick={teacher.shareScreen} title="Share screen">
                    <Monitor className="h-4 w-4" />
                  </Button>
                  {/* Recording controls */}
                  {!teacher.isRecording ? (
                    <Button variant="outline" size="icon" onClick={handleStartRecording} title="Start recording" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Circle className="h-4 w-4 fill-current" />
                    </Button>
                  ) : (
                    <Button variant="destructive" size="icon" onClick={handleStopRecordingAndUpload} title="Stop recording" disabled={uploading} className="animate-pulse">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />}
                    </Button>
                  )}
                  {teacher.isRecording && (
                    <span className="text-xs text-destructive font-mono tabular-nums">
                      {Math.floor(teacher.recordingDuration / 60)}:{(teacher.recordingDuration % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                </>
              )}
              {!isTeacher && (
                <Button variant="outline" size="icon" onClick={student.raiseHand} title="Raise hand">
                  <Hand className="h-4 w-4" />
                </Button>
              )}
              {/* Recordings link for teacher */}
              {isTeacher && liveClass && (
                <Button variant="outline" size="icon" onClick={() => navigate(`/recordings/${liveClass.id}`)} title="View recordings">
                  <Film className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => setShowChat((s) => !s)} title="Toggle chat" className={showChat ? "bg-primary/10" : ""}>
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={handleStop} className="gap-1.5 ml-1">
                <PhoneOff className="h-4 w-4" /> {isTeacher ? "End" : "Leave"}
              </Button>
            </div>
          )}
        </div>

        {/* Raised hands notification */}
        {isTeacher && teacher.raisedHands.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 shrink-0">
            <Hand className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Hand raised:</strong> {teacher.raisedHands.join(", ")}
            </span>
          </div>
        )}

        {/* Pre-join screen */}
        {!isActive && !student.ended && isExpired && (
          <div className="flex flex-1 items-center justify-center flex-col gap-4 p-8">
            <div className="rounded-full bg-muted p-6">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">This class has {liveClass.status === "expired" ? "expired" : "ended"}</h2>
            <p className="text-muted-foreground">
              {liveClass.status === "expired"
                ? "Live classes expire 24 hours after creation. Please schedule a new class."
                : "The teacher has ended this live session."}
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        )}

        {!isActive && !student.ended && !isExpired && (
          <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isTeacher ? "Choose how to go live" : "Ready to watch?"}</DialogTitle>
                <DialogDescription>
                  {isTeacher
                    ? "Pick a broadcast mode to start your live class."
                    : "You'll watch the teacher's live stream with real-time chat."}
                </DialogDescription>
              </DialogHeader>

              {isUpcoming && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Scheduled for <span className="font-medium text-foreground">{format(scheduledTime, "EEEE, MMMM d 'at' h:mm a")}</span>
                  </p>
                </div>
              )}

              {!user && <p className="text-sm text-destructive">Please sign in to join the class.</p>}

              {isTeacher ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button onClick={handleStartCamera} className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" disabled={!user}>
                    <Camera className="h-4 w-4" /> Camera + Audio
                  </Button>
                  <Button onClick={handleStartScreen} variant="outline" className="gap-2" disabled={!user}>
                    <ScreenShare className="h-4 w-4" /> Screen Share
                  </Button>
                  <Button onClick={handleStartAudio} variant="outline" className="gap-2" disabled={!user}>
                    <AudioLines className="h-4 w-4" /> Audio Only
                  </Button>
                </div>
              ) : (
                <Button onClick={handleStudentJoin} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" disabled={!user}>
                  <Video className="h-4 w-4" /> Join Stream
                </Button>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Class ended screen */}
        {student.ended && !student.connected && (
          <div className="flex flex-1 items-center justify-center flex-col gap-4 p-8">
            <div className="rounded-full bg-muted p-6">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Class has ended</h2>
            <p className="text-muted-foreground">The teacher has ended this live session.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        )}

        {/* Live view with chat */}
        {isActive && (
          <div className="flex-1 flex overflow-hidden">
            {/* Video area */}
            <div className="flex-1 flex flex-col items-center justify-center bg-black relative min-w-0">
              {/* Teacher view */}
              {isTeacher && (
                <>
                  {teacher.screenStream ? (
                    <>
                      <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
                      <video ref={teacherVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-40 h-28 rounded-lg border-2 border-primary object-cover shadow-lg z-10" />
                    </>
                  ) : teacher.isCamOff ? (
                    <div className="flex flex-col items-center gap-3 text-white">
                      <div className="rounded-full bg-white/10 p-8">
                        <AudioLines className="h-16 w-16" />
                      </div>
                      <p className="text-lg font-medium">Audio Only Mode</p>
                      <p className="text-sm text-white/60">Students can hear you</p>
                      {/* Hidden video to keep stream alive */}
                      <video ref={teacherVideoRef} autoPlay playsInline muted className="hidden" />
                    </div>
                  ) : (
                    <video ref={teacherVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                  )}
                </>
              )}

              {/* Student view */}
              {!isTeacher && (
                <>
                  {student.connecting && !student.connected && (
                    <div className="flex flex-col items-center gap-3 text-white">
                      <Loader2 className="h-10 w-10 animate-spin" />
                      <p className="text-lg">Connecting to broadcast...</p>
                      <p className="text-sm text-white/60">Waiting for the teacher to be live</p>
                    </div>
                  )}
                  {student.connected && (
                    <video ref={studentVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
                  )}
                </>
              )}
            </div>

            {/* Chat panel */}
            {showChat && (
              <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
                <div className="px-4 py-3 border-b border-border font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" /> Live Chat
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {chatMessages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Say hello! 👋</p>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`text-sm ${msg.userId === user?.id ? "text-right" : ""}`}>
                        <span className="font-medium text-xs text-primary">{msg.userId === user?.id ? "You" : msg.userName}</span>
                        <div className={`mt-0.5 inline-block rounded-lg px-3 py-1.5 text-sm max-w-[90%] ${
                          msg.userId === user?.id
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-muted text-foreground"
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <form onSubmit={handleSendChat} className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 text-sm h-9"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveClass;
