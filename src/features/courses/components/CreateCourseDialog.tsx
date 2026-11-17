import { useRef, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateCourseDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const locked = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || locked.current) return;
    if (!title.trim()) { toast.error("Enter a course title"); return; }
    locked.current = true;
    setCreating(true);
    try {
    const { error } = await supabase
      .from("courses")
      .insert({
        teacher_id: user.id,
        title: title.trim(),
        description,
        category: category || null,
        difficulty: difficulty || null,
        is_published: false,
      })
      .select()
      .single();

    if (error) toast.error(error.message);
    else {
      toast.success("Course created!");
      onCreated();
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setDifficulty("");
    }
    } catch { toast.error("Could not create the course. Please retry."); }
    finally { locked.current = false; setCreating(false); }
  };

  return (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
          <Plus className="h-4 w-4" /> New Course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div>
            <Label htmlFor="dashboard-field-1">Title</Label>
            <Input
              id="dashboard-field-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="dashboard-field-2">Description</Label>
            <Textarea
              id="dashboard-field-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dashboard-field-3">Category</Label>
              <Input
                id="dashboard-field-3"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Web Development"
              />
            </div>
            <div>
              <Label htmlFor="dashboard-select-4">
                Difficulty
              </Label>
              <Select
                value={difficulty}
                onValueChange={setDifficulty}
              >
                <SelectTrigger id="dashboard-select-4">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    Beginner
                  </SelectItem>
                  <SelectItem value="intermediate">
                    Intermediate
                  </SelectItem>
                  <SelectItem value="advanced">
                    Advanced
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
            disabled={creating}
          >
            {creating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}{" "}
            Create Course
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
