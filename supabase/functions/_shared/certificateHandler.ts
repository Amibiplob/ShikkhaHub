import { boundedJson, corsHeaders } from "./http.ts";
import { certificatePdf, type CertificateSnapshot } from "./certificatePdf.ts";
export function certificateHandler(deps: {
  origins: string[];
  publicOrigin: string;
  readRecord: (
    authorization: string,
    id: string,
  ) => Promise<CertificateSnapshot | null>;
  fonts: () => Promise<{ latin: Uint8Array; bangla: Uint8Array }>;
}) {
  return async (request: Request) => {
    const headers = corsHeaders(request, deps.origins);
    if (!headers) return new Response("Origin not allowed", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST")
      return new Response("Method not allowed", { status: 405, headers });
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer "))
      return new Response("Sign in required", { status: 401, headers });
    try {
      const { certificate_id } = await boundedJson(request, 1024);
      if (
        typeof certificate_id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(certificate_id)
      )
        return new Response("Invalid certificate", { status: 400, headers });
      const record = await deps.readRecord(authorization, certificate_id);
      if (!record)
        return new Response("Downloadable certificate not found", {
          status: 403,
          headers,
        });
      const bytes = await certificatePdf(
        record,
        deps.publicOrigin,
        await deps.fonts(),
      );
      return new Response(bytes as BodyInit, {
        headers: {
          ...headers,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="certificate-${record.id}.pdf"`,
        },
      });
    } catch {
      return new Response(
        "Certificate could not be generated. Contact support if the problem persists.",
        { status: 400, headers },
      );
    }
  };
}
