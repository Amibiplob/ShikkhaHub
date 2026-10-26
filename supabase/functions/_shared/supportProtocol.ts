export const supportCategories = [
  "account",
  "courses",
  "tutoring",
  "certificates",
  "technical",
  "other",
] as const;
export type ContactFields = {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  website?: string;
};
export function contactErrors(fields: ContactFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (fields.name.trim().length < 2 || fields.name.trim().length > 120)
    errors.name = "Enter a name between 2 and 120 characters.";
  if (
    fields.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
  )
    errors.email = "Enter a valid email address.";
  if (!(supportCategories as readonly string[]).includes(fields.category))
    errors.category = "Choose a support category.";
  if (fields.subject.trim().length < 3 || fields.subject.trim().length > 160)
    errors.subject = "Use a subject between 3 and 160 characters.";
  if (fields.message.trim().length < 10 || fields.message.trim().length > 5000)
    errors.message = "Use a message between 10 and 5,000 characters.";
  if (fields.website) errors.website = "Unable to submit this request.";
  return errors;
}
const encoder = new TextEncoder();
export async function sha256(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}
export const hex = (bytes: Uint8Array) =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function decode(value: string) {
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}
async function key(secret: string) {
  if (secret.length < 32) throw new Error("Support server is not configured");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function emailBucket(email: string, secret: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await key(secret),
        encoder.encode(email.trim().toLowerCase()),
      ),
    ),
  );
}
export async function supportChallenge(
  email: string,
  secret: string,
  now = Date.now(),
) {
  const payload = encode(
    encoder.encode(
      JSON.stringify({
        nonce: crypto.randomUUID(),
        issued: now,
        email: await emailBucket(email, secret),
      }),
    ),
  );
  const signature = encode(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await key(secret),
        encoder.encode(payload),
      ),
    ),
  );
  return `${payload}.${signature}`;
}
export async function validProof(token: string, counter: number) {
  if (!Number.isSafeInteger(counter) || counter < 0 || counter > 2_000_000)
    return false;
  const digest = await sha256(`${token}.${counter}`);
  return digest[0] === 0 && digest[1] < 16; // 12 bits, also enforced by server.
}
export async function verifyChallenge(
  token: string,
  counter: number,
  email: string,
  secret: string,
  now = Date.now(),
) {
  try {
    if (token.length > 1000 || token.split(".").length !== 2) return null;
    const [payload, signature] = token.split(".");
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        await key(secret),
        decode(signature),
        encoder.encode(payload),
      ))
    )
      return null;
    const data = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (
      typeof data.nonce !== "string" ||
      !/^[0-9a-f-]{36}$/.test(data.nonce) ||
      typeof data.issued !== "number" ||
      data.issued > now ||
      now - data.issued > 600_000 ||
      data.email !== (await emailBucket(email, secret)) ||
      !(await validProof(token, counter))
    )
      return null;
    return { nonce: data.nonce as string, bucket: data.email as string };
  } catch {
    return null;
  }
}
export async function solveChallenge(token: string, signal?: AbortSignal) {
  for (let counter = 0; counter <= 2_000_000; counter++) {
    if (signal?.aborted) throw new Error("Request cancelled");
    if (await validProof(token, counter)) return counter;
    if (counter % 256 === 0)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Unable to complete the anti-spam check. Please try again.");
}
