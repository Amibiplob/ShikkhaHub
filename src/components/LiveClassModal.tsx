import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video, Camera, ScreenShare, AudioLines, PhoneOff, Calendar, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LiveClassModalProps {
  liveClass: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (id: string, status: string) => void;
}

const LiveClassModal = ({ liveClass, open, onOpenChange, onStatusChange }: LiveClassModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ending, setEnding] = useState(false);

  if (!liveClass) return null;

  const isTeacher = user?.id === liveClass.teacher_id;
  const isLive = liveClass.status === "live";
  const isExpired = ["expired", "completed"].includes(liveClass.status);
  const scheduledTime = new Date(liveClass.scheduled_at);

  const handleGoLive = () => {
    onOpenChange(false);
    navigate(`/live/${liveClass.room_name}`);
  };

  const handleEndMeeting = async () => {
    setEnding(true);
    const { error } = await supabase
      .from("live_classes")
      .update({ status: "expired" })
      .eq("id", liveClass.id);
    if (error) {
      toast.error("Failed to end meeting");
    } else {
      toast.success("Meeting ended");
      onStatusChange?.(liveClass.id, "expired");
      onOpenChange(false);
    }
    setEnding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            {liveClass.title}
          </DialogTitle>
          <DialogDescription>
            {liveClass.courses?.title || "Live Class"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(scheduledTime, "EEEE, MMMM d 'at' h:mm a")}</span>
            </div>
            {liveClass.duration_minutes && (
              <p className="text-sm text-muted-foreground">Duration: {liveClass.duration_minutes} min</p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={isLive ? "default" : isExpired ? "destructive" : "secondary"} className={isLive ? "bg-green-600 text-white" : ""}>
                {isLive ? "● Live" : isExpired ? "Expired" : liveClass.status}
              </Badge>
            </div>
          </div>

          {liveClass.description && (
            <p className="text-sm text-muted-foreground">{liveClass.description}</p>
          )}

          {!isExpired && (
            <div className="space-y-3">
              {isTeacher ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button onClick={handleGoLive} className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                    <Camera className="h-4 w-4" /> Camera
                  </Button>
                  <Button onClick={handleGoLive} variant="outline" className="gap-2">
                    <ScreenShare className="h-4 w-4" /> Screen Share
                  </Button>
                  <Button onClick={handleGoLive} variant="outline" className="gap-2">
                    <AudioLines className="h-4 w-4" /> Audio Only
                  </Button>
                </div>
              ) : (
                <Button onClick={handleGoLive} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                  <Video className="h-4 w-4" /> Join Stream
                </Button>
              )}

              {isTeacher && (
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={handleEndMeeting}
                  disabled={ending}
                >
                  {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                  End Meeting
                </Button>
              )}
            </div>
          )}

          {isExpired && (
            <p className="text-sm text-center text-muted-foreground">This meeting has ended.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveClassModal;
