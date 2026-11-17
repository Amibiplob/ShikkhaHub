import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { LiveSession } from "@/types/models";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import LiveClassroom from "@/features/live-classes/LiveClassroom";

export default function LiveClass() {
  const { roomName } = useParams();
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const [result, setResult] = useState<{
    room: string;
    session: LiveSession | null;
    teacherName?: string;
  } | null>(null);
  useEffect(() => {
    if (!roomName) return;
    let active = true;
    void Promise.resolve(supabase
      .from("live_classes")
      .select("*, courses(title)")
      .eq("room_name", roomName)
      .single())
      .then(async ({ data }) => {
        if (!active) return;
        const teacher = data ? await supabase.from("profiles").select("full_name").eq("user_id", data.teacher_id).maybeSingle() : null;
        if (active) setResult({ room: roomName, session: data, teacherName: teacher?.data?.full_name || undefined });
      }).catch(() => { if (active) setResult({ room: roomName, session: null }); });
    return () => {
      active = false;
    };
  }, [roomName]);
  if (!roomName || !result || result.room !== roomName)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2
          aria-label="Loading classroom"
          className="animate-spin text-primary"
        />
      </div>
    );
  if (!result.session || !user)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">
          {lang === "bn"
            ? "ক্লাস পাওয়া যায়নি অথবা অনুমতি নেই"
            : "Class not found or access denied"}
        </h1>
        <Button asChild>
          <Link to="/dashboard">
            {lang === "bn" ? "ড্যাশবোর্ডে ফিরুন" : "Back to dashboard"}
          </Link>
        </Button>
      </div>
    );
  const name =
    profile?.full_name || user.user_metadata?.full_name || "Participant";
  return (
    <LiveClassroom
      key={`${roomName}:${user.id}`}
      session={result.session}
      teacherName={result.teacherName}
      userId={user.id}
      name={name}
    />
  );
}
