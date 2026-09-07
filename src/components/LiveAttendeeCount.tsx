import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface LiveAttendeeCountProps {
  roomName: string;
  /** When true, this client also counts itself as present in the room. */
  track?: boolean;
  userId?: string;
  className?: string;
}

/**
 * Shows how many people are currently inside a live class room,
 * based on Supabase Realtime presence.
 */
const LiveAttendeeCount = ({ roomName, track = false, userId, className }: LiveAttendeeCountProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!roomName) return;
    const key = userId || `guest-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(`presence-live-${roomName}`, {
      config: { presence: { key } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && track) {
          await channel.track({ joined_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomName, track, userId]);

  return (
    <Badge variant="outline" className={className}>
      <Users className="mr-1 h-3.5 w-3.5" />
      {count} {count === 1 ? "person" : "people"} in class
    </Badge>
  );
};

export default LiveAttendeeCount;
