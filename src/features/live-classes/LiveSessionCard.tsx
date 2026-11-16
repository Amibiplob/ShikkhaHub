import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import type { LiveSession } from "@/types/models";

/** Presentation only. Admission and host permissions remain in the classroom. */
export default function LiveSessionCard({
  session,
  onOpen,
}: {
  session: LiveSession;
  onOpen: (session: LiveSession) => void;
}) {
  const { lang } = useLanguage();
  const bn = lang === "bn";
  const live = session.status === "live";
  const ended = ["completed", "expired"].includes(session.status);
  const status = live
    ? bn
      ? "এখন চলছে"
      : "Live now"
    : session.status === "completed"
      ? bn
        ? "শেষ হয়েছে"
        : "Ended"
      : session.status === "expired"
        ? bn
          ? "মেয়াদ শেষ"
          : "Expired"
        : bn
          ? "নির্ধারিত"
          : "Scheduled";
  return (
    <article className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Video
          aria-hidden="true"
          className="mt-1 h-5 w-5 shrink-0 text-primary"
        />
        <div className="min-w-0">
          <h3 className="font-semibold break-words">{session.title}</h3>
          {session.courses?.title && (
            <p className="text-sm text-muted-foreground">
              {session.courses.title}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            <time dateTime={session.scheduled_at}>
              {new Date(session.scheduled_at).toLocaleString(
                bn ? "bn-BD" : "en-US",
                { dateStyle: "medium", timeStyle: "short" },
              )}
            </time>
            {session.duration_minutes
              ? ` · ${session.duration_minutes} ${bn ? "মিনিট" : "min"}`
              : ""}
          </p>
          <Badge className="mt-2" variant={live ? "default" : "secondary"}>
            {status}
          </Badge>
        </div>
      </div>
      {!ended && (
        <Button
          variant={live ? "default" : "outline"}
          onClick={() => onOpen(session)}
        >
          {live
            ? bn
              ? "লাইভ ক্লাসে যোগ দিন"
              : "Join Live Class"
            : bn
              ? "সেশন দেখুন"
              : "View Session"}
        </Button>
      )}
    </article>
  );
}
