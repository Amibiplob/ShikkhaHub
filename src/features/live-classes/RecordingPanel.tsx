import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Upload, Trash2, Film } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
    try {
      const file = `${classId}/${draft.id}.${draft.mime.includes("mp4") ? "mp4" : "webm"}`;
      const { data: existing, error: lookupError } = await supabase
        .from("class_recordings")
        .select("id")
        .eq("id", draft.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) {
        const blob = await recordingBlob(draft);
        if (!blob.size) throw new Error("No saved recording chunks.");
        const { error: uploadError } = await supabase.storage
          .from("class-recordings")
          .upload(file, blob, {
            contentType: draft.mime.split(";")[0],
            upsert: false,
          });
        if (
          uploadError &&
          !["409", "Duplicate"].includes(
            String(
              (uploadError as { statusCode?: string }).statusCode ||
                uploadError.name,
            ),
          )
        )
          throw uploadError;
        const { error } = await supabase
          .from("class_recordings")
          .insert({
            id: draft.id,
            teacher_id: userId,
            live_class_id: classId,
            file_url: file,
            file_size: blob.size,
            duration_seconds: draft.duration,
            title: draft.title,
          });
        if (error && error.code !== "23505") throw error;
      }
      await deleteDraft(draft.id);
      await refresh();
      toast.success("Recording saved privately.");
    } catch {
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
                ? l("Ready to save", "সংরক্ষণের জন্য প্রস্তুত")
                : l(
                    "Interrupted — playback may be incomplete",
                    "বাধাগ্রস্ত — সম্পূর্ণ নাও চলতে পারে",
                  )}
            </p>
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
