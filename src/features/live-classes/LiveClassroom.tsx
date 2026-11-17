import ClassroomChat from "./ClassroomChat";
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
  Ellipsis,
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
import PreJoinLobby from "./PreJoinLobby";
import DeviceSettings from "./DeviceSettings";
import { useDeviceInventory } from "./useDeviceInventory";
import type { MediaKind } from "./useWebRTCBroadcast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function LiveClassroom({
  session,
  teacherName,
  userId,
  name,
}: {
  session: NonNullable<LiveSession>;
  teacherName?: string;
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
  const inventory = useDeviceInventory();
  const [mediaConsent, setMediaConsent] = useState<{ kind: MediaKind; deviceId?: string } | null>(null);
  const [recordDialog, setRecordDialog] = useState(false);
  const [ending, setEnding] = useState(false);
  const [actionError, setActionError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
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
  const requestDevice = (kind: MediaKind, deviceId?: string) => {
    if (meeting.active && !host && !me?.consent) {
      setMediaConsent({ kind, deviceId });
      return;
    }
    void meeting.device(kind, deviceId);
  };
  const join = async () => {
    try {
      await meeting.join(consent);
      if (host) {
        const { error } = await supabase.from("live_classes")
          .update({ status: "live" }).eq("id", session.id);
        if (error) {
          setActionError(l("Could not start the class. Check your connection and retry.", "ক্লাস শুরু করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"));
          await meeting.leave();
          return;
        }
        setClassStatus("live");
      }
    } catch {
      // Admission errors are separate from optional device errors.
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
    reason?: string,
  ) => (
    <span title={reason} className="inline-flex">
    <Button
      aria-label={label}
      title={reason || label}
      aria-pressed={pressed}
      variant={pressed ? "secondary" : "outline"}
      size="icon"
      onClick={action}
      disabled={disabled}
      className="h-11 w-11 shrink-0 rounded-xl"
    >
      <Icon className="h-5 w-5" />
    </Button>
    </span>
  );
  const expired =
    meeting.ended || ["expired", "completed"].includes(classStatus);
  const hostName =
    meeting.participants.find((p) => p.id === session.teacher_id)?.name ||
    teacherName || l("Class teacher", "শিক্ষক");
  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-3 sm:px-6">
        <Link
          to={`/courses/${session.course_id}`}
          aria-label={l("Back to course", "কোর্সে ফিরুন")}
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
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
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
              {host && meeting.recordingState === "starting" ? l("Starting recording…", "রেকর্ডিং শুরু হচ্ছে…") : host && ["stopping", "processing"].includes(meeting.recordingState) ? l("Saving on this device…", "ডিভাইসে সংরক্ষণ হচ্ছে…") : l("Recording", "রেকর্ড হচ্ছে")}
              {host && ` · ${time(meeting.recordingDuration)}`}
            </span>
          )}
        </div>
      </header>
      {host && meeting.recordingState !== "idle" && <p role="status" data-testid="recording-status" className="border-b bg-muted/50 px-4 py-2 text-sm">
        {meeting.recordingState === "starting" ? l("Starting recording — notifying participants and preparing local storage…", "রেকর্ডিং শুরু হচ্ছে — অংশগ্রহণকারীদের জানানো ও স্থানীয় সংরক্ষণ প্রস্তুত করা হচ্ছে…")
          : meeting.recordingState === "recording" ? l("Recording in progress. Stop recording to save a local draft.", "রেকর্ডিং চলছে। স্থানীয় খসড়া সংরক্ষণ করতে রেকর্ডিং বন্ধ করুন।")
          : ["stopping", "processing"].includes(meeting.recordingState) ? l("Processing recording. Keep this page open while it is saved on this device.", "রেকর্ডিং প্রক্রিয়াকরণ চলছে। এই ডিভাইসে সংরক্ষণ শেষ হওয়া পর্যন্ত পৃষ্ঠা খোলা রাখুন।")
          : meeting.recordingState === "completed" ? l("Recording saved on this device. Open Recordings to download or upload it.", "রেকর্ডিং এই ডিভাইসে সংরক্ষিত। ডাউনলোড বা আপলোড করতে রেকর্ডিং খুলুন।")
          : l("Recording failed. Review the message below, then retry. Any saved chunks remain in Recordings.", "রেকর্ডিং ব্যর্থ। নিচের বার্তা দেখে আবার চেষ্টা করুন। সংরক্ষিত অংশ রেকর্ডিং প্যানেলে রয়েছে।")}
      </p>}
      {meeting.recordingWarning && <p role="status" className="bg-amber-500/10 px-4 py-2 text-sm">{l("Recording capture was delayed. Keep this tab visible and review the saved playback for gaps.", "রেকর্ডিং ক্যাপচারে বিলম্ব হয়েছে। এই ট্যাব খোলা রাখুন এবং সংরক্ষিত রেকর্ডিংয়ে বিরতি আছে কিনা দেখুন।")}</p>}
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
      {meeting.active && Object.values(meeting.deviceErrors).some(Boolean) && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 bg-amber-500/10 px-4 py-2 text-sm">
          <span>{Object.values(meeting.deviceErrors).filter(Boolean).join(" ")}</span>
          <button className="underline" onClick={() => setPanel("settings")}>{l("Device settings", "ডিভাইস সেটিংস")}</button>
        </div>
      )}
      {!meeting.active ? (
        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
          {expired ? <div className="mx-auto max-w-xl rounded-3xl border bg-card p-6 text-center">
            <h2 className="text-2xl font-semibold">{l("Class has ended", "ক্লাস শেষ হয়েছে")}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{l("Saved recordings remain available to authorized course participants.", "অনুমোদিত কোর্স অংশগ্রহণকারীরা সংরক্ষিত রেকর্ডিং দেখতে পারবেন।")}</p>
            <Button asChild variant="outline" className="mt-5"><Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{l("Back", "ফিরুন")}</Link></Button>
          </div> : <PreJoinLobby
            title={session.title}
            courseId={session.course_id}
            teacherName={hostName}
            participant={{ id: userId, name, slot: -1, connected: false, ...meeting.localMedia }}
            host={host} consent={consent} setConsent={setConsent} joining={meeting.joining}
            devices={inventory.devices} known={inventory.known} missing={inventory.missing}
            refresh={inventory.refresh} errors={meeting.deviceErrors} onDevice={requestDevice}
            onJoin={() => void join()}
          />}
          {host && <details open={expired} className="mx-auto mt-6 w-full max-w-5xl rounded-2xl border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">{l("Recordings on this device", "এই ডিভাইসে রেকর্ডিং")}</summary>
            <div className="mt-4"><RecordingPanel userId={userId} classId={session.id} revision={meeting.recordingState} /></div>
          </details>}
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
                  {panel === "chat" && <ClassroomChat messages={meeting.messages} />}
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
                      <DeviceSettings devices={inventory.devices} onDevice={requestDevice} refresh={inventory.refresh} />
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
                  requestDevice("audio");
                },
                me?.muted,
                inventory.missing("audio", me?.stream),
                inventory.missing("audio", me?.stream) ? l("No microphone detected. You can still listen and chat.", "মাইক্রোফোন নেই। শুনতে ও চ্যাট করতে পারবেন।") : undefined,
              )}
              {control(
                me?.cameraOff
                  ? l("Camera on", "ক্যামেরা চালু")
                  : l("Camera off", "ক্যামেরা বন্ধ"),
                me?.cameraOff ? VideoOff : Video,
                () => {
                  requestDevice("video");
                },
                me?.cameraOff,
                inventory.missing("video", me?.stream),
                inventory.missing("video", me?.stream) ? l("No camera detected. You can join with camera off.", "ক্যামেরা নেই। ক্যামেরা বন্ধ রেখেই ক্লাস করা যাবে।") : undefined,
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-label={l("More options", "আরও বিকল্প")} title={l("More options", "আরও বিকল্প")} variant="outline" size="icon" className="h-11 w-11 rounded-xl"><Ellipsis className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setPanel("settings")}><Settings2 className="mr-2 h-4 w-4" />{l("Device settings", "ডিভাইস সেটিংস")}</DropdownMenuItem>
                  {host && <DropdownMenuItem onSelect={() => setPanel("recordings")}><Film className="mr-2 h-4 w-4" />{l("View recordings", "রেকর্ডিং দেখুন")}</DropdownMenuItem>}
                  {!host && <DropdownMenuItem onSelect={meeting.raiseHand}><Hand className="mr-2 h-4 w-4" />{l("Raise hand", "হাত তুলুন")}</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
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
      <Dialog open={!!mediaConsent} onOpenChange={open => { if (!open) setMediaConsent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l("Share your media?", "আপনার মিডিয়া শেয়ার করবেন?")}</DialogTitle>
            <DialogDescription>{l("Your shared microphone or camera may be recorded by the teacher for authorized course participants. Recording is always indicated. You can keep listening and chatting without sharing devices.", "অনুমোদিত কোর্স অংশগ্রহণকারীদের জন্য শিক্ষক আপনার শেয়ার করা মাইক্রোফোন বা ক্যামেরা রেকর্ড করতে পারবেন। রেকর্ডিং নির্দেশক দেখানো হবে। ডিভাইস শেয়ার না করেও শুনতে ও চ্যাট করতে পারবেন।")}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => {
            if (!mediaConsent) return;
            setConsent(true);
            void meeting.device(mediaConsent.kind, mediaConsent.deviceId, true);
            setMediaConsent(null);
          }}>{l("I consent — enable device", "সম্মতি দিচ্ছি — ডিভাইস চালু")}</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={recordDialog} onOpenChange={setRecordDialog}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {l("Record this classroom?", "ক্লাস রেকর্ড করবেন?")}
            </DialogTitle>
            <DialogDescription>
              {l(
                "No camera or microphone is required. Your available microphone, camera, presentation and consenting participant media will be recorded. Everyone sees a recording indicator. Listeners without media consent are excluded. Shared presentation audio is included only when the browser supplies it and you enable it in the sharing prompt.",
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
