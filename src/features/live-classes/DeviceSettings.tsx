import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { MediaKind } from "./useWebRTCBroadcast";

export default function DeviceSettings({ devices, onDevice, refresh }: {
  devices: MediaDeviceInfo[];
  onDevice: (kind: MediaKind, deviceId?: string) => void;
  refresh: () => Promise<void>;
}) {
  const { lang } = useLanguage();
  const l = (en: string, bn: string) => lang === "bn" ? bn : en;
  return <div className="space-y-4">
    {(["audio", "video"] as const).map(kind => <label key={kind} className="block text-sm font-medium">
      {kind === "audio" ? l("Microphone input", "মাইক্রোফোন") : l("Camera input", "ক্যামেরা")}
      <select
        aria-label={kind === "audio" ? l("Microphone input", "মাইক্রোফোন") : l("Camera input", "ক্যামেরা")}
        className="mt-2 w-full min-w-0 rounded-lg border bg-background p-2"
        defaultValue=""
        onChange={event => { if (event.target.value) onDevice(kind, event.target.value); }}
      >
        <option value="">{l("Choose device", "ডিভাইস নির্বাচন")}</option>
        <option value="default">{l("Browser default", "ব্রাউজারের ডিফল্ট")}</option>
        {devices.filter(d => d.kind === `${kind}input` && d.deviceId !== "default").map((d, i) =>
          <option key={d.deviceId || i} value={d.deviceId}>{d.label || `${kind} ${i + 1}`}</option>)}
      </select>
    </label>)}
    <Button variant="outline" size="sm" onClick={() => void refresh()}>
      <RefreshCw className="mr-2 h-4 w-4" />{l("Check devices", "ডিভাইস পরীক্ষা করুন")}
    </Button>
    <p className="text-xs leading-relaxed text-muted-foreground">
      {l("Devices stay off until you enable them. If permission was denied, update your browser settings, then check devices again.",
        "চালু না করা পর্যন্ত ডিভাইস বন্ধ থাকবে। অনুমতি না দিলে ব্রাউজারের সেটিংস বদলে আবার ডিভাইস পরীক্ষা করুন।")}
    </p>
  </div>;
}
