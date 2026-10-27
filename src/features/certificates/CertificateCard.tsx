import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "../../components/ui/button";
import { Award } from "lucide-react";
import { toast } from "sonner";
import { downloadCertificate } from "@/features/certificates/certificates";
import type { Tables } from "@/integrations/supabase/types";
interface Props {
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  teacherName?: string;
}
export default function CertificateCard({ courseId }: Props) {
  const [busy, setBusy] = useState(false),
    [certificate, setCertificate] = useState<Tables<"certificates"> | null>(
      null,
    );
  const claim = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("issue_course_certificate", {
        target_course: courseId,
      });
      if (error) throw error;
      setCertificate(data);
      toast.success("Certificate ready");
    } catch (e) {
      toast.error(
        (e as { message?: string }).message || "Could not issue certificate",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={claim} disabled={busy}>
        <Award className="mr-2 h-4 w-4" />
        {busy ? "Checking requirements…" : "Check certificate eligibility"}
      </Button>
      {certificate && (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadCertificate(certificate.id);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Download PDF
          </Button>
          <Button asChild variant="ghost">
            <Link to={`/certificates/verify/${certificate.verification_token}`}>
              Verify certificate
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
