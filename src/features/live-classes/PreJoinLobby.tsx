import { Link } from "react-router-dom";
import { ArrowLeft, Mic, MicOff, Video, VideoOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import MediaTile from "./MediaTile";
import DeviceSettings from "./DeviceSettings";
import type { Participant, MediaKind } from "./useWebRTCBroadcast";

export default function PreJoinLobby({ title, participant, host, consent, setConsent, joining,
  devices, known, missing, refresh, errors, onDevice, onJoin }: {
  title: string;
  participant: Participant;
  host: boolean;
  consent: boolean;
  setConsent: (consent: boolean) => void;
  joining: boolean;
  devices: MediaDeviceInfo[];
  known: boolean;
  missing: (kind: MediaKind, stream?: MediaStream | null) => boolean;
  refresh: () => Promise<void>;
  errors: Partial<Record<MediaKind, string>>;
  onDevice: (kind: MediaKind, deviceId?: string) => void;
  onJoin: () => void;
}) {
  const { lang } = useLanguage();
  const l = (en: string, bn: string) => lang === "bn" ? bn : en;
  const noMic = missing("audio", participant.stream), noCamera = missing("video", participant.stream);
  return <div className="mx-auto grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
    <div className="min-w-0 rounded-3xl bg-slate-950 p-3 sm:p-4">
      <MediaTile participant={participant} local />
      <div className="mt-4 flex justify-center gap-3 pb-1">
        {([
          ["audio", participant.muted, noMic, Mic, MicOff, l("Unmute", "মাইক চালু"), l("Mute", "মাইক বন্ধ"), l("No microphone detected. You can join without it.", "মাইক্রোফোন পাওয়া যায়নি। এটি ছাড়াই যোগ দিন।")],
          ["video", participant.cameraOff, noCamera, Video, VideoOff, l("Camera on", "ক্যামেরা চালু"), l("Camera off", "ক্যামেরা বন্ধ"), l("No camera detected. You can join without it.", "ক্যামেরা পাওয়া যায়নি। এটি ছাড়াই যোগ দিন।")],
        ] as const).map(([kind, off, absent, On, Off, enable, disable, reason]) => <span key={kind} title={absent ? reason : undefined}>
          <Button
            aria-label={off ? enable : disable} title={absent ? reason : off ? enable : disable}
            aria-pressed={!off} disabled={absent || joining}
            variant={off ? "secondary" : "default"} size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => onDevice(kind)}
          >{off ? <Off className="h-5 w-5" /> : <On className="h-5 w-5" />}</Button>
        </span>)}
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">{l("Only you can see this preview", "এই প্রিভিউ শুধু আপনি দেখতে পাচ্ছেন")}</p>
    </div>
    <div className="min-w-0 space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{l("Ready to join?", "যোগ দিতে প্রস্তুত?")}</p>
        <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <p role="status" className="text-sm leading-relaxed text-muted-foreground">
        {noMic && noCamera ? l("No camera or microphone detected. You can join without them.", "ক্যামেরা বা মাইক্রোফোন পাওয়া যায়নি। এগুলো ছাড়াই ক্লাসে যোগ দিতে পারেন।")
          : noMic ? l("No microphone detected. Your camera and class audio still work.", "মাইক্রোফোন পাওয়া যায়নি। ক্যামেরা ও ক্লাসের অডিও ব্যবহার করতে পারেন।")
          : noCamera ? l("No camera detected. You can still speak and listen.", "ক্যামেরা পাওয়া যায়নি। কথা বলা ও শোনা যাবে।")
          : known ? l("Camera and microphone are optional. Turn on only what you need.", "ক্যামেরা ও মাইক্রোফোন ঐচ্ছিক। প্রয়োজন হলে চালু করুন।")
          : l("You can join with camera and microphone off. Device availability is not yet known.", "ক্যামেরা ও মাইক্রোফোন বন্ধ রেখেই যোগ দিতে পারেন। ডিভাইসের তথ্য এখনো জানা যায়নি।")}
      </p>
      {Object.entries(errors).filter(([, message]) => message).map(([kind, message]) =>
        <p key={kind} role="status" className="rounded-xl bg-amber-500/10 p-3 text-sm">
          <strong>{kind === "audio" ? l("Microphone", "মাইক্রোফোন") : l("Camera", "ক্যামেরা")}: </strong>{message}
        </p>)}
      {!host && <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />
        <span>{l("I consent to my shared microphone and camera being recorded by the teacher for authorized course participants. Without consent, I join without sharing devices.",
          "অনুমোদিত কোর্স অংশগ্রহণকারীদের জন্য শিক্ষক আমার শেয়ার করা মাইক্রোফোন ও ক্যামেরা রেকর্ড করতে পারবেন। সম্মতি ছাড়া ডিভাইস শেয়ার হবে না।")}</span>
      </label>}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="h-12 rounded-full px-8" disabled={joining} onClick={onJoin}>
          {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {joining ? l("Joining…", "যোগ হচ্ছে…") : l("Join Class", "ক্লাসে যোগ দিন")}
        </Button>
        <Button asChild variant="ghost" className="rounded-full"><Link to="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />{l("Back", "ফিরুন")}
        </Link></Button>
      </div>
      <details className="rounded-xl border p-3">
        <summary className="cursor-pointer text-sm font-medium">{l("Device settings", "ডিভাইস সেটিংস")}</summary>
        <div className="mt-4"><DeviceSettings devices={devices} onDevice={onDevice} refresh={refresh} /></div>
      </details>
    </div>
  </div>;
}
