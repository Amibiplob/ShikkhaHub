import { supabase } from "@/integrations/supabase/client";
export async function downloadCertificate(id: string) {
  const { data, error } = await supabase.functions.invoke("certificate-pdf", {
    body: { certificate_id: id },
  });
  if (error || !(data instanceof Blob) || data.type !== "application/pdf")
    throw new Error(
      "Could not download your certificate. Check your session or contact support.",
    );
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shikkhahub-certificate-${id}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
