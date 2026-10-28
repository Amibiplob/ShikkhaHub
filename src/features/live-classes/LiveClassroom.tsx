import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  MonitorOff,
  Users,
  MessageSquare,
  Circle,
  Square,
  PhoneOff,
  Send,
  Hand,
  Settings2,
  Film,
  ArrowLeft,
  Loader2,
  GraduationCap,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import type { LiveSession } from "@/types/models";
import { useClassroomMedia } from "./useWebRTCBroadcast";
import MediaTile from "./MediaTile";
import RecordingPanel from "./RecordingPanel";

export default function LiveClassroom({
  session,
  userId,
  name,
}: {
  session: NonNullable<LiveSession>;
  userId: string;
  name: string;
}) {
  const { lang } = useLanguage();
  const l = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const host = userId === session.teacher_id;
  const meeting = useClassroomMedia(
    session.room_name,
    userId,
    name,
    session.teacher_id,
  );
  const me = meeting.participants.find((p) => p.id === userId);
  const [classStatus, setClassStatus] = useState(session.status);
  const [panel, setPanel] = useState<
    "chat" | "people" | "settings" | "recordings" | null
  >(null);
  const [input, setInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [startMuted, setStartMuted] = useState(false);
  const [startCameraOff, setStartCameraOff] = useState(false);
  const [recordDialog, setRecordDialog] = useState(false);
  const [ending, setEnding] = useState(false);
  const [actionError, setActionError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);
  const recording = [
    "starting",
    "recording",
    "stopping",
    "processing",
  ].includes(meeting.recordingState);
  useEffect(() => {
    if (!meeting.active) return;
    started.current = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [meeting.active]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [meeting.messages]);
  useEffect(() => {
    const update = () => {
      void navigator.mediaDevices
        ?.enumerateDevices()
        .then(setDevices)
        .catch(() => undefined);
    };
    update();
    navigator.mediaDevices?.addEventListener("devicechange", update);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", update);
  }, [meeting.active, meeting.busy]);
  const join = async (mode: "camera" | "audio-only" | "screen" | "listen") => {
    try {
      await meeting.join(mode, consent, startMuted);
      if (host) {
        const { error } = await supabase
          .from("live_classes")
          .update({ status: "live" })
          .eq("id", session.id);
        if (error) {
          await meeting.leave();
          return;
        }
        setClassStatus("live");
      }
    } catch {
      /* The hook presents the recoverable media error. */
    }
  };
  const end = async () => {
    if (ending) return;
    setEnding(true);
    try {
      if (recording) await meeting.stopRecording();
      if (host) {
        const { error } = await supabase
          .from("live_classes")
          .update({ status: "completed" })
          .eq("id", session.id);
        if (error)
          throw new Error(
            "Could not end class. Check the connection and retry.",
          );
        setClassStatus("completed");
      }
      await meeting.leave();
    } catch {
      setPanel("recordings");
      setActionError(
        l(
          "Could not finish the class. Review the recording and retry.",
          "ক্লাস শেষ করা যায়নি। রেকর্ডিং দেখে আবার চেষ্টা করুন।",
        ),
      );
    } finally {
      setEnding(false);
    }
  };
  const time = (seconds: number) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const control = (
    label: string,
    Icon: typeof Mic,
    action: () => void,
    pressed?: boolean,
    disabled = false,
  ) => (
    <Button
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      variant={pressed ? "secondary" : "outline"}
      size="icon"
      onClick={action}
      disabled={disabled}
      className="h-11 w-11 shrink-0 rounded-xl"
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
  const expired =
    meeting.ended || ["expired", "completed"].includes(classStatus);
  const hostName =
    meeting.participants.find((p) => p.id === session.teacher_id)?.name ||
    l("Class teacher", "শিক্ষক");
  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-3 sm:px-6">
        <Link
          to="/dashboard"
          aria-label={l("Back to dashboard", "ড্যাশবোর্ডে ফিরুন")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <GraduationCap className="h-6 w-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            ShikkhaHub · {l("Live classroom", "লাইভ ক্লাস")}
          </p>
          <h1 className="truncate text-base font-semibold sm:text-xl">
            {session.title}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {session.courses?.title} · {hostName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-4">
          <span
            role="status"
            className={`rounded-full px-2.5 py-1 ${meeting.connection === "connected" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
          >
            {meeting.connection === "connected"
              ? l("Connected", "সংযুক্ত")
              : meeting.connection === "waiting"
                ? l("Waiting for teacher", "শিক্ষকের জন্য অপেক্ষা")
                : meeting.connection === "reconnecting"
                  ? l("Reconnecting…", "পুনঃসংযোগ হচ্ছে…")
                  : meeting.active
                    ? l("Connecting…", "সংযোগ হচ্ছে…")
                    : l("Classroom", "শ্রেণিকক্ষ")}
          </span>
          {meeting.active && (
            <>
              <span
                aria-label="Session duration"
                className="font-mono tabular-nums"
              >
                {time(elapsed)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {meeting.participants.length}
              </span>
            </>
          )}
          {meeting.recordingNotice && (
            <span
              role="status"
              data-testid="recording-notice"
              className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-red-600 dark:text-red-400"
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {l("Recording", "রেকর্ড হচ্ছে")}
              {host && ` · ${time(meeting.recordingDuration)}`}
            </span>
          )}
        </div>
      </header>
      {actionError && (
        <div role="alert" className="bg-destructive/10 px-4 py-2 text-sm">
          {actionError}
        </div>
      )}
      {meeting.error && (
        <div
          role="alert"
          className="flex shrink-0 items-start justify-between gap-2 border-b bg-amber-500/10 px-4 py-2 text-sm"
        >
          <span>{meeting.error}</span>
          <button aria-label="Dismiss error" onClick={meeting.clearError}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {meeting.active && meeting.hands.length > 0 && (
        <div className="shrink-0 bg-amber-500/10 px-4 py-2 text-sm">
          <Hand className="mr-2 inline h-4 w-4" />
          {l("Hand raised", "হাত তুলেছেন")}: {meeting.hands.join(", ")}
        </div>
      )}
      {!meeting.active ? (
        <section className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:py-16">
          <div className="w-full max-w-xl rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Video className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold">
              {expired
                ? l("Class has ended", "ক্লাস শেষ হয়েছে")
                : host
                  ? l("Ready to teach?", "ক্লাস নিতে প্রস্তুত?")
                  : l("Ready to join?", "যোগ দিতে প্রস্তুত?")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {expired
                ? l(
                    "Your session is complete. Saved recordings remain available to authorized course participants.",
                    "সেশন সম্পন্ন হয়েছে। অনুমোদিত অংশগ্রহণকারীরা সংরক্ষিত রেকর্ডিং দেখতে পারবেন।",
                  )
                : l(
                    "A focused space to learn together. Check your media preferences before entering.",
                    "একসাথে শেখার শ্রেণিকক্ষ। প্রবেশের আগে আপনার মিডিয়া পছন্দ ঠিক করুন।",
                  )}
            </p>
            {!expired && (
              <>
                <p className="mt-4 text-xs text-muted-foreground">
                  {new Date(session.scheduled_at).toLocaleString(
                    lang === "bn" ? "bn-BD" : "en-GB",
                  )}
                </p>
                <label className="mt-5 flex items-start gap-3 rounded-xl border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    {l(
                      "I consent to my shared microphone and camera being recorded by the teacher for authorized course participants. Recording is always indicated. Without consent, join as a listener.",
                      "অনুমোদিত কোর্স অংশগ্রহণকারীদের জন্য শিক্ষক আমার শেয়ার করা মাইক্রোফোন ও ক্যামেরা রেকর্ড করতে পারবেন। রেকর্ডিং নির্দেশক দেখানো হবে। সম্মতি ছাড়া শ্রোতা হিসেবে যোগ দিন।",
                    )}
                  </span>
                </label>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={startMuted}
                    onChange={(e) => setStartMuted(e.target.checked)}
                  />
                  {l(
                    "Start with microphone muted",
                    "মাইক্রোফোন বন্ধ রেখে শুরু করুন",
                  )}
                </label>
                {!host && (
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={startCameraOff}
                      onChange={(e) => setStartCameraOff(e.target.checked)}
                    />
                    {l("Start with camera off", "ক্যামেরা বন্ধ রেখে শুরু করুন")}
                  </label>
                )}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {host ? (
                    <>
                      <Button
                        onClick={() => void join("camera")}
                        disabled={meeting.busy}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        {l("Camera + Audio", "ক্যামেরা ও অডিও")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void join("audio-only")}
                        disabled={meeting.busy}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        {l("Audio Only", "শুধু অডিও")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void join("screen")}
                        disabled={meeting.busy}
                      >
                        <MonitorUp className="mr-2 h-4 w-4" />
                        {l("Screen Share", "স্ক্রিন শেয়ার")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() =>
                        void join(
                          consent
                            ? startCameraOff
                              ? "audio-only"
                              : "camera"
                            : "listen",
                        )
                      }
                      disabled={meeting.busy}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      {l("Join Stream", "ক্লাসে যোগ দিন")}
                    </Button>
                  )}
                </div>
                {meeting.busy && (
                  <p role="status" className="mt-4 text-sm">
                    {l("Connecting securely…", "নিরাপদে সংযোগ হচ্ছে…")}
                  </p>
                )}
              </>
            )}
            <Button variant="ghost" asChild className="mt-4">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {l("Back to dashboard", "ড্যাশবোর্ডে ফিরুন")}
              </Link>
            </Button>
          </div>
          {host && (
            <div className="mt-6 w-full max-w-xl rounded-2xl border bg-card p-5">
              <RecordingPanel
                userId={userId}
                classId={session.id}
                revision={meeting.recordingState}
              />
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="relative flex min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:p-4">
            <section
              aria-label={l("Meeting stage", "ক্লাসের ভিডিও")}
              className={`min-h-0 min-w-0 flex-1 gap-3 overflow-y-auto rounded-2xl bg-slate-950 p-3 ${meeting.screen ? "grid grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_240px] lg:grid-rows-1" : "flex flex-col"}`}
            >
              {meeting.connection === "waiting" && (
                <div
                  role="status"
                  className="flex items-center justify-center gap-3 rounded-xl bg-white/5 p-6 text-sm text-slate-300"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {l(
                    "Waiting for the teacher to start the class",
                    "শিক্ষকের ক্লাস শুরু করার অপেক্ষা",
                  )}
                </div>
              )}
              {meeting.screen && (
                <MediaTile
                  presentation
                  local={host}
                  participant={{
                    id: "presentation",
                    name: l("Teacher presentation", "শিক্ষকের উপস্থাপনা"),
                    stream: meeting.screen,
                    cameraOff: false,
                    muted: false,
                    consent: true,
                    slot: -2,
                    connected: true,
                  }}
                />
              )}
              <div
                className={`grid min-h-0 gap-3 ${meeting.screen ? "max-h-[28dvh] grid-cols-2 content-start overflow-y-auto lg:max-h-none lg:grid-cols-1" : `flex-1 items-center ${meeting.participants.length <= 2 ? "content-center" : "content-start"} ${meeting.participants.length > 4 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : meeting.participants.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}`}
              >
                {meeting.participants.map((p) => (
                  <MediaTile
                    key={p.id}
                    participant={p}
                    local={p.id === userId}
                  />
                ))}
                {me?.cameraOff && (
                  <p className="col-span-full text-center text-xs text-slate-400">
                    {l("Audio Only Mode", "শুধু অডিও মোড")}
                  </p>
                )}
              </div>
            </section>
            {panel && (
              <aside
                aria-label={l("Meeting panel", "ক্লাসের প্যানেল")}
                className="absolute inset-3 z-20 flex min-h-0 flex-col rounded-2xl border bg-card shadow-xl sm:static sm:w-80 sm:shrink-0"
              >
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h2 className="font-semibold">
                    {panel === "chat"
                      ? l("Live Chat", "লাইভ চ্যাট")
                      : panel === "people"
                        ? l("Participants", "অংশগ্রহণকারী")
                        : panel === "recordings"
                          ? l("Recordings", "রেকর্ডিং")
                          : l("Device settings", "ডিভাইস সেটিংস")}
                  </h2>
                  <Button
                    aria-label={l("Close panel", "প্যানেল বন্ধ করুন")}
                    size="icon"
                    variant="ghost"
                    onClick={() => setPanel(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {panel === "chat" && (
                    <div className="space-y-4">
                      {meeting.messages.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          {l(
                            "Start the conversation. Ask a question or say hello.",
                            "কথা শুরু করুন। প্রশ্ন করুন বা শুভেচ্ছা জানান।",
                          )}
                        </p>
                      )}
                      {meeting.messages.map((m) => (
                        <div key={m.id} className="min-w-0 text-sm">
                          <p className="mb-1 text-xs font-semibold text-primary">
                            {m.userName}
                          </p>
                          <p className="break-words rounded-xl bg-muted px-3 py-2 [overflow-wrap:anywhere]">
                            {m.message}
                          </p>
                        </div>
                      ))}
                      <div ref={chatEnd} />
                    </div>
                  )}
                  {panel === "people" && (
                    <ul className="space-y-3">
                      {meeting.participants.map((p) => (
                        <li
                          key={p.id}
                          className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/50 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.id === session.teacher_id
                                ? l("Teacher · Host", "শিক্ষক")
                                : p.consent
                                  ? l(
                                      "Media consent granted",
                                      "মিডিয়ার সম্মতি দেওয়া হয়েছে",
                                    )
                                  : l(
                                      "Listener · not recorded",
                                      "শ্রোতা · রেকর্ড হবে না",
                                    )}
                            </p>
                          </div>
                          {p.muted ? (
                            <MicOff className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <Mic className="h-4 w-4 shrink-0 text-emerald-500" />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {panel === "settings" && (
                    <div className="space-y-5">
                      <p className="text-sm text-muted-foreground">
                        {l(
                          "Device access stays under your control. Screen capture requires a separate browser prompt.",
                          "ডিভাইসের নিয়ন্ত্রণ আপনার হাতে। স্ক্রিন শেয়ারের জন্য ব্রাউজারে আলাদা অনুমতি প্রয়োজন।",
                        )}
                      </p>
                      {(["audio", "video"] as const).map((kind) => (
                        <label key={kind} className="block text-sm font-medium">
                          {kind === "audio"
                            ? l("Microphone input", "মাইক্রোফোন")
                            : l("Camera input", "ক্যামেরা")}
                          <select
                            aria-label={
                              kind === "audio"
                                ? "Microphone input"
                                : "Camera input"
                            }
                            className="mt-2 w-full min-w-0 rounded-lg border bg-background p-2"
                            defaultValue=""
                            disabled={!me?.consent}
                            onChange={(e) => {
                              if (e.target.value)
                                void meeting.device(kind, e.target.value);
                            }}
                          >
                            <option value="">
                              {l("Choose device", "ডিভাইস নির্বাচন")}
                            </option>
                            {devices
                              .filter((d) => d.kind === `${kind}input`)
                              .map((d, i) => (
                                <option
                                  key={d.deviceId || i}
                                  value={d.deviceId}
                                >
                                  {d.label || `${kind} ${i + 1}`}
                                </option>
                              ))}
                          </select>
                        </label>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        {l(
                          "Capture: 640 × 360 at up to 24 fps. Recording: 1280 × 720 at up to 15 fps; 30 minutes or 128 MiB per recording. Background video can freeze while audio continues when supported.",
                          "ক্যাপচার: সর্বোচ্চ ২৪ fps-এ ৬৪০ × ৩৬০। রেকর্ডিং: সর্বোচ্চ ১৫ fps-এ ১২৮০ × ৭২০; প্রতি রেকর্ডিং ৩০ মিনিট বা ১২৮ MiB। অন্য ট্যাবে ভিডিও থামতে পারে; সমর্থিত হলে অডিও চলবে।",
                        )}
                      </p>
                    </div>
                  )}
                  {panel === "recordings" && host && (
                    <RecordingPanel
                      userId={userId}
                      classId={session.id}
                      revision={meeting.recordingState}
                    />
                  )}
                </div>
                {panel === "chat" && (
                  <form
                    className="flex shrink-0 gap-2 border-t p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      meeting.sendChat(input);
                      setInput("");
                    }}
                  >
                    <Input
                      aria-label={l("Live chat message", "লাইভ চ্যাট বার্তা")}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      maxLength={2000}
                      placeholder={l(
                        "Message the class…",
                        "ক্লাসে বার্তা দিন…",
                      )}
                      className="min-w-0"
                    />
                    <Button
                      aria-label={l("Send chat message", "বার্তা পাঠান")}
                      size="icon"
                      disabled={!input.trim()}
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </aside>
            )}
          </div>
          <footer className="shrink-0 border-t bg-card px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2">
              {control(
                me?.muted ? l("Unmute", "মাইক চালু") : l("Mute", "মাইক বন্ধ"),
                me?.muted ? MicOff : Mic,
                () => {
                  void meeting.device("audio");
                },
                me?.muted,
                !me?.consent,
              )}
              {control(
                me?.cameraOff
                  ? l("Camera on", "ক্যামেরা চালু")
                  : l("Camera off", "ক্যামেরা বন্ধ"),
                me?.cameraOff ? VideoOff : Video,
                () => {
                  void meeting.device("video");
                },
                me?.cameraOff,
                !me?.consent,
              )}
              {host &&
                control(
                  meeting.screen
                    ? l("Stop sharing", "শেয়ার বন্ধ")
                    : l("Share screen", "স্ক্রিন শেয়ার"),
                  meeting.screen ? MonitorOff : MonitorUp,
                  () => {
                    void (meeting.screen
                      ? meeting.stopScreen()
                      : meeting.shareScreen());
                  },
                  !!meeting.screen,
                  meeting.busy,
                )}
              {control(
                l("Participants", "অংশগ্রহণকারী"),
                Users,
                () => setPanel(panel === "people" ? null : "people"),
                panel === "people",
              )}
              {control(
                l("Toggle chat", "চ্যাট"),
                MessageSquare,
                () => setPanel(panel === "chat" ? null : "chat"),
                panel === "chat",
              )}
              {!host &&
                control(l("Raise hand", "হাত তুলুন"), Hand, meeting.raiseHand)}
              {host &&
                control(
                  recording
                    ? l("Stop recording", "রেকর্ড বন্ধ")
                    : l("Start recording", "রেকর্ড শুরু"),
                  recording ? Square : Circle,
                  () => {
                    if (recording) {
                      setPanel("recordings");
                      void meeting.stopRecording().catch(() => undefined);
                    } else setRecordDialog(true);
                  },
                  recording,
                  ["starting", "stopping", "processing"].includes(
                    meeting.recordingState,
                  ),
                )}
              {host &&
                control(
                  l("View recordings", "রেকর্ডিং দেখুন"),
                  Film,
                  () => setPanel(panel === "recordings" ? null : "recordings"),
                  panel === "recordings",
                )}
              {control(
                l("Device settings", "ডিভাইস সেটিংস"),
                Settings2,
                () => setPanel(panel === "settings" ? null : "settings"),
                panel === "settings",
              )}
              <Button
                aria-label={host ? l("End", "ক্লাস শেষ") : l("Leave", "বের হন")}
                variant="destructive"
                onClick={() => void end()}
                disabled={ending}
                className="h-11 gap-2 rounded-xl px-4"
              >
                <PhoneOff className="h-4 w-4" />
                <span>{host ? l("End", "শেষ") : l("Leave", "বের হন")}</span>
              </Button>
            </div>
          </footer>
        </>
      )}
      <Dialog open={recordDialog} onOpenChange={setRecordDialog}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {l("Record this classroom?", "ক্লাস রেকর্ড করবেন?")}
            </DialogTitle>
            <DialogDescription>
              {l(
                "Your microphone, camera, presentation and consenting participant media will be recorded. Everyone sees a recording indicator. Listeners without media consent are excluded. Shared presentation audio is included only when the browser supplies it and you enable it in the sharing prompt.",
                "আপনার মাইক্রোফোন, ক্যামেরা, উপস্থাপনা এবং সম্মত অংশগ্রহণকারীদের মিডিয়া রেকর্ড হবে। সবাই রেকর্ডিং নির্দেশক দেখবেন। সম্মতি না দেওয়া শ্রোতারা বাদ থাকবেন। ব্রাউজারে অনুমোদিত শেয়ার করা অডিও থাকলেই তা অন্তর্ভুক্ত হবে।",
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {l(
              "Private to authorized course participants",
              "শুধুমাত্র অনুমোদিত অংশগ্রহণকারীদের জন্য",
            )}
          </p>
          <Button
            onClick={() => {
              setRecordDialog(false);
              void meeting.startRecording(session.id, session.title);
            }}
          >
            {l("I consent — start recording", "সম্মতি দিচ্ছি — রেকর্ড শুরু")}
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
