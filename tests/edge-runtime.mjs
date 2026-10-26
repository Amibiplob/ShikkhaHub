// Local Deno compatibility smoke. Authorization/database adapters are synthetic;
// this does not contact Supabase or prove hosted function deployment.
import assert from "node:assert/strict";
import { certificatePdf } from "../supabase/functions/_shared/certificatePdf.ts";
import { certificateHandler } from "../supabase/functions/_shared/certificateHandler.ts";
import { supportHandler } from "../supabase/functions/_shared/supportHandler.ts";
import { solveChallenge } from "../supabase/functions/_shared/supportProtocol.ts";
const fonts = {
  latin: await Deno.readFile(
    "supabase/functions/_shared/fonts/NotoSans-Regular.ttf",
  ),
  bangla: await Deno.readFile(
    "supabase/functions/_shared/fonts/NotoSansBengali-Regular.ttf",
  ),
};
const record = {
  id: "00000000-0000-4000-9000-000000000001",
  certificate_number: "CERT-DENO-LOCAL-TEST",
  student_name: "রহিম উদ্দিন",
  course_title: "Programming Foundations",
  issued_at: "2026-10-27T00:00:00Z",
  verification_token: "00000000-0000-4000-9000-000000000002",
};
const bytes = await certificatePdf(record, "https://app.example.test", fonts);
assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
await Deno.mkdir("artifacts/phase3-pdf", { recursive: true });
await Deno.writeFile("artifacts/phase3-pdf/deno-bangla-certificate.pdf", bytes);
const pdfHandler = certificateHandler({
  origins: ["https://app.example.test"],
  publicOrigin: "https://app.example.test",
  fonts: async () => fonts,
  readRecord: async (authorization, id) =>
    authorization === "Bearer local-test-session" && id === record.id
      ? record
      : null,
});
for (const [authorization, expected] of [
  ["Bearer local-test-session", 200],
  ["Bearer local-outsider", 403],
]) {
  const response = await pdfHandler(
    new Request("https://api.example.test", {
      method: "POST",
      headers: {
        Origin: "https://app.example.test",
        Authorization: authorization,
      },
      body: JSON.stringify({
        certificate_id: record.id,
        student_name: "Forged",
      }),
    }),
  );
  assert.equal(response.status, expected);
  if (expected === 200)
    assert.equal(response.headers.get("content-type"), "application/pdf");
}
let saved;
const handler = supportHandler({
  secret: "synthetic-deno-local-only-material-1234567890",
  origins: ["https://app.example.test"],
  authenticate: async () => null,
  intake: async (data) => {
    saved = data;
    return "synthetic-ticket";
  },
});
const request = (body) =>
  new Request("https://api.example.test", {
    method: "POST",
    headers: { Origin: "https://app.example.test" },
    body: JSON.stringify(body),
  });
const fields = {
  name: "Local Test",
  email: "person@example.test",
  category: "courses",
  subject: "Learning support",
  message: "Please explain the enrollment workflow.",
};
const challenge = await handler(
  request({ action: "challenge", email: fields.email }),
);
assert.equal(challenge.status, 200);
const { token } = await challenge.json();
const counter = await solveChallenge(token);
const response = await handler(
  request({ ...fields, token, counter, user_id: "spoof" }),
);
assert.equal(response.status, 200);
assert.equal(saved.owner_id, null);
assert.equal(saved.sender_email, fields.email);
console.log(
  JSON.stringify({
    runtime: Deno.version.deno,
    pdfBytes: bytes.length,
    checksPassed: [
      "Bangla PDF",
      "PDF handler authorization",
      "support proof and guest ownership",
    ],
    hosted: false,
  }),
);
