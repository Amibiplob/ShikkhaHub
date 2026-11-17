import { useState } from 'react';
import { Film, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import PrivateVideo from '@/components/shared/PrivateVideo';
import PrivateFileLink from '@/components/shared/PrivateFileLink';
import { useRecordingPage, RECORDINGS_PER_PAGE } from './useRecordingPage';

export default function CourseRecordings({ courseId }: { courseId: string }) {
  const { recordings, total, page, setPage, loading, error, retry } = useRecordingPage({ courseId });
  const [expandedRecording, setExpandedRecording] = useState<string | null>(null);
  if (loading) return <p role="status" className="mt-8">Loading recordings…</p>;
  if (error) return <div role="alert" className="mt-8">Could not load recordings. <Button variant="outline" onClick={retry}>Retry recordings</Button></div>;
  return <>
    {total > 0 && (
      <div className="mt-8">
        <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Film className="h-5 w-5 text-primary" /> Class Recordings (
          {total})
        </h3>
        <div className="space-y-3">
          {recordings.map((rec) => {
            const isExpanded = expandedRecording === rec.id;
            return (
              <div
                key={rec.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Film className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          new Date(rec.created_at),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                        {rec.duration_seconds &&
                          ` • ${Math.floor(rec.duration_seconds / 60)} min`}
                        {rec.file_size &&
                          ` • ${(rec.file_size / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PrivateFileLink
                      bucket="class-recordings"
                      path={rec.file_url}
                    >
                      Download recording
                    </PrivateFileLink>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      aria-expanded={isExpanded}
                      aria-controls={`recording-${rec.id}`}
                      onClick={() =>
                        setExpandedRecording(isExpanded ? null : rec.id)
                      }
                    >
                      <PlayCircle className="h-3.5 w-3.5" />{" "}
                      {isExpanded ? "Collapse" : "Watch"}
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div
                    id={`recording-${rec.id}`}
                    className="mt-3 aspect-video rounded-lg overflow-hidden bg-black"
                  >
                    <PrivateVideo
                      bucket="class-recordings"
                      path={rec.file_url}
                      autoPlay
                      className="h-full w-full"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {total > RECORDINGS_PER_PAGE && <div className="mt-4 flex items-center gap-3">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous recordings</Button>
          <span>Page {page + 1} of {Math.ceil(total / RECORDINGS_PER_PAGE)}</span>
          <Button variant="outline" disabled={(page + 1) * RECORDINGS_PER_PAGE >= total} onClick={() => setPage(p => p + 1)}>Next recordings</Button>
        </div>}
      </div>
    )}

  </>;
}
