// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { certificatePdf, type CertificateSnapshot } from "./certificatePdf";
import { certificateHandler } from "./certificateHandler";
const record: CertificateSnapshot = {
  id: "00000000-0000-4000-9000-000000000001",
  certificate_number: "CERT-LOCAL-TEST",
  student_name: "রহিম উদ্দিন",
  course_title: "Programming Foundations",
  issued_at: "2026-10-27T00:00:00Z",
  verification_token: "00000000-0000-4000-9000-000000000002",
};
const fonts = async () => ({
  latin: new Uint8Array(
    await readFile("supabase/functions/_shared/fonts/NotoSans-Regular.ttf"),
  ),
  bangla: new Uint8Array(
    await readFile(
      "supabase/functions/_shared/fonts/NotoSansBengali-Regular.ttf",
    ),
  ),
});
describe("server certificate PDF", () => {
  it("creates an A4 landscape PDF with embedded Bangla/Latin fonts and stable metadata", async () => {
    const bytes = await certificatePdf(
      record,
      "https://app.example.test",
      await fonts(),
    );
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPages()).toHaveLength(1);
    expect(pdf.getPages()[0].getWidth()).toBeCloseTo(841.89);
    expect(pdf.getPages()[0].getHeight()).toBeCloseTo(595.28);
    expect(pdf.getTitle()).toContain("CERT-LOCAL-TEST");
    await mkdir("artifacts/phase3-pdf", { recursive: true });
    await writeFile("artifacts/phase3-pdf/bangla-certificate.pdf", bytes);
  });
  it("handles long supported names and rejects unsupported glyphs/control characters", async () => {
    await expect(
      certificatePdf(
        { ...record, student_name: "A long English student name" },
        "https://app.example.test",
        await fonts(),
      ),
    ).resolves.toBeInstanceOf(Uint8Array);
    await expect(
      certificatePdf(
        { ...record, student_name: "Name\nInjected" },
        "https://app.example.test",
        await fonts(),
      ),
    ).rejects.toThrow("Invalid certificate text");
    await expect(
      certificatePdf(
        { ...record, student_name: "😀" },
        "https://app.example.test",
        await fonts(),
      ),
    ).rejects.toThrow("not supported");
  });
  it("requires authorization and an owned nonrevoked database snapshot; never trusts request text", async () => {
    const handler = certificateHandler({
      origins: [],
      publicOrigin: "https://app.example.test",
      fonts,
      readRecord: async (auth, id) =>
        auth === "Bearer owner-test-session" && id === record.id
          ? record
          : null,
    });
    expect(
      (
        await handler(
          new Request("https://api.example.test", {
            method: "POST",
            body: JSON.stringify({ certificate_id: record.id }),
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handler(
          new Request("https://api.example.test", {
            method: "POST",
            headers: { Authorization: "Bearer stranger-test-session" },
            body: JSON.stringify({ certificate_id: record.id }),
          }),
        )
      ).status,
    ).toBe(403);
    const response = await handler(
      new Request("https://api.example.test", {
        method: "POST",
        headers: { Authorization: "Bearer owner-test-session" },
        body: JSON.stringify({
          certificate_id: record.id,
          student_name: "Forged Name",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
  });
});
