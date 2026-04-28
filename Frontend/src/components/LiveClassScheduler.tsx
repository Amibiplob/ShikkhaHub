import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Video } from "lucide-react";
import { toast } from "sonner";

interface LiveClassSchedulerProps {
  courses: { id: string; title: string }[];
  onCreated?: (liveClass: any) => void;
}

const LiveClassScheduler = ({ courses, onCreated }: LiveClassSchedulerProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");

  const generateRoomName = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);

    const roomName = generateRoomName();
    const { data, error } = await supabase
      .from("live_classes")
      .insert({
        course_id: courseId,
        teacher_id: user.id,
        title,
        description: description || null,
        room_name: roomName,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(duration),
      })
      .select("*, courses(title)")
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Live class scheduled!");
      // Notify enrolled students
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", courseId);
      if (enrollments && enrollments.length > 0) {
        const notifications = enrollments.map((e) => ({
          user_id: e.user_id,
          title: "Live Class Scheduled",
          message: `"${title}" is scheduled for ${new Date(scheduledAt).toLocaleDateString()}`,
          type: "live_class",
          link: `/live/${data.room_name}`,
        }));
        await supabase.from("notifications").insert(notifications);
      }
      onCreated?.(data);
      setOpen(false);
      setTitle("");
      setDescription("");
      setCourseId("");
      setScheduledAt("");
      setDuration("60");
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
          <Plus className="h-4 w-4" /> Schedule Live Class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" /> Schedule Live Class
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId} required>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 3: React Hooks Deep Dive" required />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What will be covered..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={creating || !courseId}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule Class
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LiveClassScheduler;
