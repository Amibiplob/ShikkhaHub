import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Award, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CertificateCardProps {
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  teacherName?: string;
}

const CertificateCard = ({ courseId, courseTitle, progressPercent, teacherName }: CertificateCardProps) => {
  const { user, profile } = useAuth();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkOrGenerate = async () => {
    if (!user) return;
    setLoading(true);

    // Check if certificate already exists
    const { data: existing } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      setCertificate(existing);
      setLoading(false);
      setChecked(true);
      return;
    }

    if (progressPercent < 100) {
      toast.error("Complete all lessons to earn your certificate!");
      setLoading(false);
      setChecked(true);
      return;
    }

    // Generate certificate
    const { data, error } = await supabase
      .from("certificates")
      .insert({ user_id: user.id, course_id: courseId })
      .select()
      .single();

    if (error) {
      toast.error("Failed to generate certificate");
    } else {
      setCertificate(data);
      toast.success("Certificate earned! 🎉");
    }
    setLoading(false);
    setChecked(true);
  };

  const downloadCertificate = () => {
    if (!certificate) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#0f1729";
    ctx.fillRect(0, 0, 1200, 800);

    // Border
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 740);

    // Inner border
    ctx.strokeStyle = "#22c55e40";
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, 1100, 700);

    // Title
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 48px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Certificate of Completion", 600, 160);

    // Divider
    ctx.strokeStyle = "#22c55e60";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(350, 190);
    ctx.lineTo(850, 190);
    ctx.stroke();

    // "This certifies that"
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px Inter, sans-serif";
    ctx.fillText("This certifies that", 600, 260);

    // Student name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Inter, sans-serif";
    ctx.fillText(profile?.full_name || "Student", 600, 320);

    // "has completed"
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px Inter, sans-serif";
    ctx.fillText("has successfully completed the course", 600, 390);

    // Course title
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 32px Inter, sans-serif";
    ctx.fillText(courseTitle, 600, 440);

    // Teacher
    if (teacherName) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px Inter, sans-serif";
      ctx.fillText(`Taught by ${teacherName}`, 600, 500);
    }

    // Date and certificate number
    ctx.fillStyle = "#64748b";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText(
      `Issued on ${format(new Date(certificate.issued_at), "MMMM d, yyyy")}`,
      600, 620
    );
    ctx.fillText(`Certificate #${certificate.certificate_number}`, 600, 650);

    // Award icon text
    ctx.fillStyle = "#22c55e40";
    ctx.font = "120px serif";
    ctx.fillText("🏆", 600, 580);

    // Download
    const link = document.createElement("a");
    link.download = `certificate-${certificate.certificate_number}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (progressPercent < 100 && !checked) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={certificate ? "default" : "outline"}
          className={certificate ? "gap-2 bg-gradient-primary text-primary-foreground" : "gap-2"}
          onClick={checkOrGenerate}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
          {certificate ? "View Certificate" : progressPercent >= 100 ? "Claim Certificate" : "Certificate"}
        </Button>
      </DialogTrigger>
      {certificate && (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Your Certificate
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-gradient-hero p-8 text-center">
            <div className="mb-4 text-5xl">🏆</div>
            <h2 className="text-2xl font-bold text-primary mb-2">Certificate of Completion</h2>
            <p className="text-muted-foreground mb-4">This certifies that</p>
            <p className="text-xl font-bold text-foreground mb-2">{profile?.full_name || "Student"}</p>
            <p className="text-muted-foreground mb-2">has successfully completed</p>
            <p className="text-lg font-semibold text-primary mb-4">{courseTitle}</p>
            {teacherName && <p className="text-sm text-muted-foreground mb-4">Taught by {teacherName}</p>}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Issued on {format(new Date(certificate.issued_at), "MMMM d, yyyy")}</p>
              <p>Certificate #{certificate.certificate_number}</p>
            </div>
          </div>
          <Button onClick={downloadCertificate} className="w-full gap-2 bg-gradient-primary text-primary-foreground">
            <Download className="h-4 w-4" /> Download Certificate
          </Button>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default CertificateCard;
