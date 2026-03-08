import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import LessonFileUpload from "@/components/LessonFileUpload";
import { BookOpen, FileText, GripVertical, Loader2, Pencil, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

interface CourseContentEditorProps {
  courseId: string;
  isTeacher: boolean;
}

const CourseContentEditor = ({ courseId, isTeacher }: CourseContentEditorProps) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Module form
  const [moduleOpen, setModuleOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Lesson form
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonModuleId, setLessonModuleId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState("article");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonFileUrl, setLessonFileUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [creatingLesson, setCreatingLesson] = useState(false);

  // Edit lesson
  const [editLesson, setEditLesson] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchModules = async () => {
    const { data } = await supabase
      .from("modules")
      .select("*, lessons(*)")
      .eq("course_id", courseId)
      .order("sort_order");
    const mods = data || [];
    mods.forEach((m: any) => m.lessons?.sort((a: any, b: any) => a.sort_order - b.sort_order));
    setModules(mods);
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, [courseId]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { error } = await supabase.from("modules").insert({
      course_id: courseId,
      title: moduleTitle,
      description: moduleDesc || null,
      sort_order: modules.length,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Module created!");
      setModuleOpen(false);
      setModuleTitle("");
      setModuleDesc("");
      fetchModules();
    }
    setCreating(false);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLesson(true);
    const mod = modules.find((m) => m.id === lessonModuleId);
    const sortOrder = mod?.lessons?.length || 0;

    const { error } = await supabase.from("lessons").insert({
      module_id: lessonModuleId,
      title: lessonTitle,
      type: lessonType,
      content: lessonType === "article" ? lessonContent : null,
      video_url: lessonType === "video" ? lessonVideoUrl : null,
      file_url: lessonType === "file" ? lessonFileUrl : null,
      duration_minutes: lessonDuration ? parseInt(lessonDuration) : null,
      sort_order: sortOrder,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Lesson created!");
      setLessonOpen(false);
      resetLessonForm();
      fetchModules();
    }
    setCreatingLesson(false);
  };

  const handleEditLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLesson) return;
    setSaving(true);
    const { error } = await supabase.from("lessons").update({
      title: editLesson.title,
      type: editLesson.type,
      content: editLesson.type === "article" ? editLesson.content : null,
      video_url: editLesson.type === "video" ? editLesson.video_url : null,
      file_url: editLesson.type === "file" ? editLesson.file_url : null,
      duration_minutes: editLesson.duration_minutes,
    }).eq("id", editLesson.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Lesson updated!");
      setEditOpen(false);
      setEditLesson(null);
      fetchModules();
    }
    setSaving(false);
  };

  const deleteModule = async (id: string) => {
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Module deleted");
      fetchModules();
    }
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Lesson deleted");
      fetchModules();
    }
  };

  const resetLessonForm = () => {
    setLessonTitle("");
    setLessonType("article");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonFileUrl("");
    setLessonDuration("");
    setLessonModuleId("");
  };

  if (!isTeacher) return null;
  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto my-8" />;

  const lessonIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-3.5 w-3.5 text-info" />;
      case "file": return <FileText className="h-3.5 w-3.5 text-warning" />;
      default: return <BookOpen className="h-3.5 w-3.5 text-primary" />;
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Pencil className="h-5 w-5 text-primary" /> Course Content Editor
        </h3>
        <div className="flex gap-2">
          <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Module</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateModule} className="space-y-4">
                <div><Label>Title</Label><Input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} required /></div>
                <div><Label>Description</Label><Textarea value={moduleDesc} onChange={(e) => setModuleDesc(e.target.value)} rows={2} /></div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Module
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="h-3.5 w-3.5" /> Lesson
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateLesson} className="space-y-4">
                <div>
                  <Label>Module</Label>
                  <Select value={lessonModuleId} onValueChange={setLessonModuleId}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={lessonType} onValueChange={setLessonType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Duration (min)</Label><Input type="number" value={lessonDuration} onChange={(e) => setLessonDuration(e.target.value)} /></div>
                </div>
                {lessonType === "article" && (
                  <div><Label>Content</Label><Textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={6} placeholder="Write lesson content..." /></div>
                )}
                {lessonType === "video" && (
                  <div className="space-y-2">
                    <Label>Video</Label>
                    <LessonFileUpload accept="video/*" label="Upload Video" onUploaded={(url) => setLessonVideoUrl(url)} />
                    {lessonVideoUrl && <p className="text-xs text-muted-foreground truncate">✓ {lessonVideoUrl.split('/').pop()}</p>}
                    <p className="text-xs text-muted-foreground">Or paste a URL:</p>
                    <Input value={lessonVideoUrl} onChange={(e) => setLessonVideoUrl(e.target.value)} placeholder="https://..." />
                  </div>
                )}
                {lessonType === "file" && (
                  <div className="space-y-2">
                    <Label>File</Label>
                    <LessonFileUpload accept="*/*" label="Upload File" onUploaded={(url) => setLessonFileUrl(url)} />
                    {lessonFileUrl && <p className="text-xs text-muted-foreground truncate">✓ {lessonFileUrl.split('/').pop()}</p>}
                    <p className="text-xs text-muted-foreground">Or paste a URL:</p>
                    <Input value={lessonFileUrl} onChange={(e) => setLessonFileUrl(e.target.value)} placeholder="https://..." />
                  </div>
                )}
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={creatingLesson || !lessonModuleId}>
                  {creatingLesson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Lesson
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No modules yet. Add your first module to start building your course.</p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={modules.map((m) => m.id)}>
          {modules.map((mod, mi) => (
            <AccordionItem key={mod.id} value={mod.id} className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span>Module {mi + 1}: {mod.title}</span>
                  <Badge variant="secondary" className="text-xs">{mod.lessons?.length || 0} lessons</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 mb-2">
                  {mod.lessons?.map((lesson: any) => (
                    <div key={lesson.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm bg-muted/50">
                      <div className="flex items-center gap-2">
                        {lessonIcon(lesson.type)}
                        <span>{lesson.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">{lesson.type}</Badge>
                        {lesson.duration_minutes && <span className="text-xs text-muted-foreground">{lesson.duration_minutes}m</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditLesson({ ...lesson }); setEditOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteLesson(lesson.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={() => deleteModule(mod.id)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Delete Module
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Edit Lesson Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Lesson</DialogTitle></DialogHeader>
          {editLesson && (
            <form onSubmit={handleEditLesson} className="space-y-4">
              <div><Label>Title</Label><Input value={editLesson.title} onChange={(e) => setEditLesson({ ...editLesson, title: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={editLesson.type} onValueChange={(v) => setEditLesson({ ...editLesson, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Duration (min)</Label><Input type="number" value={editLesson.duration_minutes || ""} onChange={(e) => setEditLesson({ ...editLesson, duration_minutes: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
              {editLesson.type === "article" && (
                <div><Label>Content</Label><Textarea value={editLesson.content || ""} onChange={(e) => setEditLesson({ ...editLesson, content: e.target.value })} rows={6} /></div>
              )}
              {editLesson.type === "video" && (
                <div className="space-y-2">
                  <Label>Video</Label>
                  <LessonFileUpload accept="video/*" label="Upload Video" onUploaded={(url) => setEditLesson({ ...editLesson, video_url: url })} />
                  {editLesson.video_url && <p className="text-xs text-muted-foreground truncate">✓ {editLesson.video_url.split('/').pop()}</p>}
                  <Input value={editLesson.video_url || ""} onChange={(e) => setEditLesson({ ...editLesson, video_url: e.target.value })} placeholder="https://..." />
                </div>
              )}
              {editLesson.type === "file" && (
                <div className="space-y-2">
                  <Label>File</Label>
                  <LessonFileUpload accept="*/*" label="Upload File" onUploaded={(url) => setEditLesson({ ...editLesson, file_url: url })} />
                  {editLesson.file_url && <p className="text-xs text-muted-foreground truncate">✓ {editLesson.file_url.split('/').pop()}</p>}
                  <Input value={editLesson.file_url || ""} onChange={(e) => setEditLesson({ ...editLesson, file_url: e.target.value })} placeholder="https://..." />
                </div>
              )}
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseContentEditor;
