import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Upload, Trash2, Film } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadRecording } from "./recording-upload";
import { useLanguage } from "@/hooks/useLanguage";
import {
  deleteDraft,
  recordingBlob,
  recordingDrafts,
  type RecordingDraft,
} from "./recording-store";

export default function RecordingPanel({
  userId,
  classId,
  revision,
}: {
  userId: string;
  classId: string;
  revision: string;
}) {
  const [drafts, setDrafts] = useState<RecordingDraft[]>([]);
  const [busy, setBusy] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const lock = useRef(false);
  const { lang } = useLanguage();
  const l = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const refresh = useCallback(async () => {
    try {
      setDrafts(await recordingDrafts(userId, classId));
    } catch {
      toast.error("Local recording storage is unavailable.");
    }
  }, [userId, classId]);
  useEffect(() => {
    let active = true;
    void recordingDrafts(userId, classId)
      .then((data) => {
        if (active) setDrafts(data);
      })
      .catch(() => toast.error("Local recording storage is unavailable."));
    return () => {
      active = false;
    };
  }, [userId, classId, revision]);
  const download = async (draft: RecordingDraft) => {
    const blob = await recordingBlob(draft);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ShikkhaHub-${draft.id}.${draft.mime.includes("mp4") ? "mp4" : "webm"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const upload = async (draft: RecordingDraft) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(draft.id);
    setUploadStatus(l("Uploading your local recording…", "স্থানীয় রেকর্ডিং আপলোড হচ্ছে…"));
    try {
      const result = await uploadRecording(draft, userId, classId);
      setUploadStatus(result.localCopyRetained
        ? l("Saved to private cloud storage. A local copy remains on this device.", "ক্লাউডে ব্যক্তিগতভাবে সংরক্ষিত। একটি স্থানীয় কপি এই ডিভাইসে রয়েছে।")
        : l("Saved to private cloud storage.", "ক্লাউডে ব্যক্তিগতভাবে সংরক্ষিত।"));
      await refresh();
      toast.success("Recording saved privately.");
    } catch {
      setUploadStatus(l("Upload failed. The recording remains saved on this device.", "আপলোড ব্যর্থ। রেকর্ডিং এই ডিভাইসে সংরক্ষিত আছে।"));
      toast.error(
        "Upload failed. Your local recording is retained. Retry or download it.",
      );
    } finally {
      lock.current = false;
      setBusy("");
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {l(
          "Recordings are private to authorized course participants. Browser drafts remain on this device until saved or discarded.",
          "রেকর্ডিং শুধুমাত্র অনুমোদিত অংশগ্রহণকারীদের জন্য। সংরক্ষণ বা মুছে ফেলা পর্যন্ত খসড়া এই ডিভাইসে থাকবে।",
        )}
      </p>
      <Button asChild variant="outline" className="w-full">
        <Link to={`/recordings/${classId}`}>
          <Film className="mr-2 h-4 w-4" />
          {l("Saved recording history", "সংরক্ষিত রেকর্ডিং")}
        </Link>
      </Button>
      {uploadStatus && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{uploadStatus}</p>}
      {drafts
        .filter(
          (d) =>
            d.complete || ["idle", "failed", "completed"].includes(revision),
        )
        .map((draft) => (
          <div key={draft.id} className="rounded-xl border p-3 text-sm">
            <p className="truncate font-medium">{draft.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(draft.createdAt).toLocaleString()} · {draft.duration}s ·{" "}
              {draft.complete
                ? l("Saved on this device · Upload pending", "এই ডিভাইসে সংরক্ষিত · আপলোড বাকি")
                : l(
                    "Interrupted — playback may be incomplete",
                    "বাধাগ্রস্ত — সম্পূর্ণ নাও চলতে পারে",
                  )}
            </p>
            {draft.captureInterrupted && <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">{l("Capture was interrupted or delayed. Review playback before relying on this recording.", "ক্যাপচারে বাধা বা বিলম্ব হয়েছে। ব্যবহারের আগে রেকর্ডিং দেখে নিন।")}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.complete && (
                <Button
                  size="sm"
                  onClick={() => void upload(draft)}
                  disabled={!!busy}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  {busy === draft.id
                    ? l("Uploading…", "আপলোড হচ্ছে…")
                    : l("Save privately", "ব্যক্তিগতভাবে সংরক্ষণ")}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void download(draft).catch(() =>
                    toast.error("Could not read recording."),
                  )
                }
                disabled={!!busy}
              >
                <Download className="mr-1 h-3 w-3" />
                {l("Download", "ডাউনলোড")}
              </Button>
              <Button
                aria-label={l(
                  "Discard local recording",
                  "স্থানীয় রেকর্ডিং মুছুন",
                )}
                size="icon"
                variant="ghost"
                disabled={!!busy}
                onClick={() => {
                  void deleteDraft(draft.id)
                    .then(refresh)
                    .catch(() =>
                      toast.error(
                        "Could not discard the local recording. Retry.",
                      ),
                    );
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
