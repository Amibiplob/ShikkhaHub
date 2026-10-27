import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
type Verified = {
  certificate_number: string;
  course_title: string;
  issued_at: string;
  status: string;
};
function CertificateVerificationContent() {
  const { token } = useParams();
  const [record, setRecord] = useState<Verified | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("verify_certificate", {
        token,
      });
      if (!active) return;
      if (error) setError("Verification is temporarily unavailable.");
      else setRecord(data as unknown as Verified | null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token, attempt]);
  return (
    <PageShell
      title="Certificate verification"
      description="Check the current status of a ShikkhaHub course-completion certificate. Recipient names and account information are withheld from this public page."
    >
      {loading ? (
        <p role="status">Checking certificate…</p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <Button onClick={() => { setLoading(true); setError(""); setRecord(null); setAttempt((a) => a + 1); }}>Retry</Button>
        </p>
      ) : record ? (
        <article className="max-w-2xl space-y-4 rounded-xl border bg-card p-6">
          <Badge
            variant={record.status === "valid" ? "default" : "destructive"}
          >
            {record.status === "valid"
              ? "Valid certificate"
              : record.status.replace(/_/g, " ")}
          </Badge>
          <h2 className="text-2xl font-semibold">{record.course_title}</h2>
          <p className="break-all text-sm">{record.certificate_number}</p>
          <p>Issued {new Date(record.issued_at).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground">
            Platform course completion; no university endorsement or
            accreditation is implied. A downloaded copy may be outdated after
            revocation.
          </p>
        </article>
      ) : (
        <p role="alert" className="rounded-xl border p-6">
          Certificate not found. Check the verification link on the PDF.
        </p>
      )}
    </PageShell>
  );
}

export default function CertificateVerification() {
 const {token}=useParams();
 return <CertificateVerificationContent key={token} />;
}
