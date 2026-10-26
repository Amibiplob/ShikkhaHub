import { boundedJson, corsHeaders } from "./http.ts";
import {
  contactErrors,
  emailBucket,
  hex,
  sha256,
  supportChallenge,
  verifyChallenge,
  type ContactFields,
} from "./supportProtocol.ts";
export interface Intake {
  nonce: string;
  owner_id: string | null;
  sender_name: string;
  sender_email: string;
  ticket_category: string;
  ticket_subject: string;
  ticket_message: string;
  email_bucket: string;
  content_hash: string;
}
export function supportHandler(deps: {
  secret: string;
  origins: string[];
  authenticate: (authorization: string) => Promise<string | null>;
  intake: (data: Intake) => Promise<string>;
}) {
  return async (request: Request) => {
    const headers = corsHeaders(request, deps.origins);
    if (!headers) return new Response("Origin not allowed", { status: 403 });
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    try {
      const body = await boundedJson(request);
      const fields: ContactFields = Object.fromEntries(
        ["name", "email", "category", "subject", "message", "website"].map(
          (k) => [k, typeof body[k] === "string" ? body[k] : ""],
        ),
      ) as ContactFields;
      if (body.action === "challenge") {
        if (
          fields.email.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)
        )
          return json({ error: "Enter a valid email address." }, 400);
        return json({
          token: await supportChallenge(fields.email, deps.secret),
        });
      }
      const errors = contactErrors(fields);
      if (Object.keys(errors).length)
        return json({ error: "Please correct the form.", fields: errors }, 400);
      const verified = await verifyChallenge(
        String(body.token || ""),
        Number(body.counter),
        fields.email,
        deps.secret,
      );
      if (!verified)
        return json(
          {
            error:
              "The anti-spam check expired or is invalid. Please try again.",
          },
          400,
        );
      let owner: string | null = null;
      const authorization = request.headers.get("authorization");
      if (authorization) {
        owner = await deps.authenticate(authorization);
        if (!owner)
          return json(
            { error: "Your session expired. Sign in and try again." },
            401,
          );
      }
      const id = await deps.intake({
        nonce: verified.nonce,
        owner_id: owner,
        sender_name: fields.name.trim(),
        sender_email: fields.email.trim().toLowerCase(),
        ticket_category: fields.category,
        ticket_subject: fields.subject.trim(),
        ticket_message: fields.message.trim(),
        email_bucket: await emailBucket(fields.email, deps.secret),
        content_hash: hex(
          await sha256(
            JSON.stringify([
              owner,
              fields.name.trim(),
              fields.email.trim().toLowerCase(),
              fields.category,
              fields.subject.trim(),
              fields.message.trim(),
            ]),
          ),
        ),
      });
      return json({
        ticket_id: id,
        message: "Your request was saved. No email delivery is implied.",
      });
    } catch (error) {
      const limited =
        error instanceof Error && error.message.includes("limit reached");
      return json(
        {
          error: limited
            ? "Support submission limit reached. Try again later."
            : "Unable to submit your request. Please try again.",
        },
        limited ? 429 : 400,
      );
    }
  };
}
