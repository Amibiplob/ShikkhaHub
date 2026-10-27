import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface LessonFileUploadProps {
  onUploaded: (url: string) => void;
  courseId: string;
  accept?: string;
  label?: string;
}

const LessonFileUpload = ({ onUploaded, courseId, accept, label = "Upload File" }: LessonFileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be under 50MB");
      return;
    }

    if (!/\.(pdf|txt|doc|docx|mp4|webm)$/i.test(file.name)) { toast.error("Unsupported file type"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${courseId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("lesson-files").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
    } else {
      onUploaded(path);
      toast.success("File uploaded!");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Uploading..." : label}
      </Button>
    </div>
  );
};

export default LessonFileUpload;
