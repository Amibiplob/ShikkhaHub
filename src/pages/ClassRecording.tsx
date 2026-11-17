import { useRecordingPage, RECORDINGS_PER_PAGE } from "@/features/live-classes/useRecordingPage";
import PrivateVideo from "@/components/shared/PrivateVideo";
import type { LiveSession } from "@/types/models";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, Loader2, VideoOff, Clock, Calendar, HardDrive } from "lucide-react";
import { format } from "date-fns";

const ClassRecordingContent = ({ classId }: { classId: string }) => {
  const navigate = useNavigate();
  const { recordings, total, page, setPage, loading: recordingsLoading, error: recordingsError, retry } = useRecordingPage({ classId });
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [liveClass, setLiveClass] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('live_classes').select('*, courses(title)').eq('id', classId).single();
      if (error) throw error;
      if (active) { setLiveClass(data); setLoadError(false); setLoading(false); }
    };
    void load().catch(() => { if (active) { setLoadError(true); setLoading(false); } });
    return () => { active = false; };
  }, [classId, revision]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading || recordingsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{liveClass?.title || "Class"} - Recordings</h1>
          <p className="text-muted-foreground text-sm mt-1">{liveClass?.courses?.title}</p>
        </div>

        {(loadError || recordingsError) && <div role="alert">Could not load recording history. <Button variant="outline" onClick={() => { retry(); setRevision(r => r + 1); }}>Retry recordings</Button></div>}
        {playingUrl && (
          <div className="mb-8 rounded-xl overflow-hidden bg-black">
            <PrivateVideo bucket="class-recordings" path={playingUrl} autoPlay className="w-full max-h-[60vh]" />
          </div>
        )}

        {loadError || recordingsError ? null : recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="rounded-full bg-muted p-6">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No recordings yet</h2>
            <p className="text-muted-foreground text-sm">The teacher hasn't recorded any sessions for this class.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <Card
                key={rec.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${playingUrl === rec.file_url ? "border-primary" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`Play recording: ${rec.title}`}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPlayingUrl(rec.file_url); } }}
                onClick={() => setPlayingUrl(rec.file_url)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="shrink-0 rounded-lg bg-primary/10 p-3">
                    <Play className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{rec.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(rec.created_at), "MMM d, yyyy")}
                      </span>
                      {rec.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(rec.duration_seconds)}
                        </span>
                      )}
                      {rec.file_size && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatFileSize(rec.file_size)}
                        </span>
                      )}
                    </div>
                  </div>
                  {playingUrl === rec.file_url && (
                    <Badge className="bg-primary text-primary-foreground">Playing</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {total > RECORDINGS_PER_PAGE && <div className="mt-4 flex gap-3 items-center">
          <Button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous recordings</Button>
          <span>Page {page + 1} of {Math.ceil(total / RECORDINGS_PER_PAGE)}</span>
          <Button disabled={(page + 1) * RECORDINGS_PER_PAGE >= total} onClick={() => setPage(p => p + 1)}>Next recordings</Button>
        </div>}
      </main>
    </div>
  );
};

export default function ClassRecording() {
  const { classId } = useParams();
  return classId ? <ClassRecordingContent key={classId} classId={classId} /> : null;
}
