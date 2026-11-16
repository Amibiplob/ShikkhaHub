import type { LiveSession } from "@/types/models";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar } from "lucide-react";
import { format } from "date-fns";

interface LiveClassModalProps {
  liveClass: LiveSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (id: string, status: string) => void;
}

const LiveClassModal = ({
  liveClass,
  open,
  onOpenChange,
}: LiveClassModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!liveClass) return null;

  const isTeacher = user?.id === liveClass.teacher_id;
  const isLive = liveClass.status === "live";
  const isExpired = ["expired", "completed"].includes(liveClass.status);
  const scheduledTime = new Date(liveClass.scheduled_at);

  const handleGoLive = () => {
    onOpenChange(false);
    navigate(`/live/${liveClass.room_name}`);
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
              <p className="text-sm text-muted-foreground">
                Duration: {liveClass.duration_minutes} min
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge
                variant={
                  isLive ? "default" : isExpired ? "destructive" : "secondary"
                }
                className={isLive ? "bg-green-600 text-white" : ""}
              >
                {isLive ? "● Live" : isExpired ? "Ended" : liveClass.status}
              </Badge>
            </div>
          </div>

          {liveClass.description && (
            <p className="text-sm text-muted-foreground">
              {liveClass.description}
            </p>
          )}

          {!isExpired && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isLive
                  ? "This class is live. Preview your settings before joining."
                  : "This class is scheduled. You can review your settings before entering."}{" "}
                Camera and microphone are optional. Screen sharing starts only
                when you choose it inside the class.
              </p>
              <Button onClick={handleGoLive} className="w-full gap-2">
                <Video className="h-4 w-4" />{" "}
                {isTeacher
                  ? "Open classroom"
                  : isLive
                    ? "Join Live Class"
                    : "View Session"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Not Now
              </Button>
            </div>
          )}

          {isExpired && (
            <p className="text-sm text-center text-muted-foreground">
              This meeting has ended.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveClassModal;
