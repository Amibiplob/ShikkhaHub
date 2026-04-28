import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface ThumbnailUploadProps {
  courseId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

const ThumbnailUpload = ({ courseId, currentUrl, onUploaded }: ThumbnailUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${courseId}/thumbnail.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("course-thumbnails")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("course-thumbnails")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error: updateError } = await supabase
      .from("courses")
      .update({ thumbnail_url: publicUrl })
      .eq("id", courseId);

    if (updateError) {
      toast.error("Failed to save thumbnail");
    } else {
      setPreview(publicUrl);
      onUploaded(publicUrl);
      toast.success("Thumbnail uploaded!");
    }
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {preview ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
          <img src={preview} alt="Thumbnail" className="h-full w-full object-cover" />
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-2 right-2 gap-1.5"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Change
          </Button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/40 hover:bg-muted"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-center">
              <ImagePlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload thumbnail</p>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default ThumbnailUpload;
