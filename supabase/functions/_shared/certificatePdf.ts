import {
  PDFDocument,
  rgb,
  type PDFFont,
  StandardFonts,
  PDFHexString,
  beginText,
  endText,
  setFillingColor,
  setFontAndSize,
  setTextMatrix,
  showText,
} from "pdf-lib";
// @deno-types="npm:@types/fontkit@2.0.9"
import { create } from "fontkit";
export interface CertificateSnapshot {
  id: string;
  certificate_number: string;
  student_name: string;
  course_title: string;
  issued_at: string;
  verification_token: string;
}
// Called only with an authorized database snapshot; never accepts browser names,
// course text or percentages. Keeping it isolated also keeps PDF/font code off SPA routes.
export async function certificatePdf(
  record: CertificateSnapshot,
  origin: string,
  fonts: { latin: Uint8Array; bangla: Uint8Array },
) {
  const publicURL = new URL(origin);
  if (
    (publicURL.protocol !== "https:" &&
      !(
        publicURL.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(publicURL.hostname)
      )) ||
    publicURL.origin !== origin.replace(/\/$/, "") ||
    !/^[0-9a-f-]{36}$/i.test(record.verification_token)
  )
    throw new Error("Invalid certificate configuration");
  const pdf = await PDFDocument.create();
  // fontkit accepts Uint8Array at runtime; its historical Node typings require Buffer.
  pdf.registerFontkit({
    create: create as unknown as Parameters<
      PDFDocument["registerFontkit"]
    >[0]["create"],
  });
  pdf.setTitle(`ShikkhaHub Certificate ${record.certificate_number}`);
  pdf.setAuthor("ShikkhaHub");
  pdf.setSubject(
    "Course completion; verify current status using the verification URL.",
  );
  pdf.setCreationDate(new Date(record.issued_at));
  pdf.setModificationDate(new Date(record.issued_at));
  // Full embedding avoids pdf-lib 1.x's legacy encodeStream subset interface.
  // Font parsing/shaping stays on the server; no PDF dependencies enter the SPA.
  const latin = await pdf.embedFont(fonts.latin);
  const bangla = await pdf.embedFont(fonts.bangla);
  const parsedBanglaFont = create(fonts.bangla as Parameters<typeof create>[0]);
  if (!("layout" in parsedBanglaFont))
    throw new Error("Expected a single Bangla font");
  const shapingFont = parsedBanglaFont;
  const heading = await pdf.embedFont(StandardFonts.TimesRoman);
  const page = pdf.addPage([841.89, 595.28]); // A4 landscape points.
  const ink = rgb(0.08, 0.16, 0.19),
    teal = rgb(0.03, 0.48, 0.45),
    muted = rgb(0.34, 0.4, 0.42);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 841.89,
    height: 595.28,
    color: rgb(0.99, 0.985, 0.96),
  });
  page.drawRectangle({
    x: 24,
    y: 24,
    width: 793.89,
    height: 547.28,
    borderColor: teal,
    borderWidth: 1.4,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: 777.89,
    height: 531.28,
    borderColor: rgb(0.72, 0.77, 0.72),
    borderWidth: 0.5,
  });
  const runs = (text: string) =>
    text.match(
      /[\u0980-\u09ff\u200c\u200d]+|[^\u0980-\u09ff\u200c\u200d]+/gu,
    ) || [];
  const fontFor = (text: string) =>
    /[\u0980-\u09ff]/u.test(text) ? bangla : latin;
  const isBangla = (text: string) => /[\u0980-\u09ff]/u.test(text);
  const runWidth = (text: string, size: number) =>
    isBangla(text)
      ? (shapingFont
          .layout(text)
          .positions.reduce((sum, position) => sum + position.xAdvance, 0) *
          size) /
        shapingFont.unitsPerEm
      : latin.widthOfTextAtSize(text, size);
  const width = (text: string, size: number) =>
    runs(text).reduce((sum, run) => sum + runWidth(run, size), 0);
  function centered(
    text: string,
    y: number,
    size: number,
    color = ink,
    font?: PDFFont,
  ) {
    if (font) {
      page.drawText(text, {
        x: (841.89 - font.widthOfTextAtSize(text, size)) / 2,
        y,
        size,
        font,
        color,
      });
      return;
    }
    // Reject unsupported scripts rather than silently replacing a name with boxes.
    for (const run of runs(text)) {
      const supported = new Set(fontFor(run).getCharacterSet());
      for (const char of run)
        if (
          !supported.has(char.codePointAt(0)!) &&
          !/[\u200c\u200d]/u.test(char)
        )
          throw new Error(
            "This name contains characters not supported by the bundled fonts. Contact support.",
          );
    }
    let x = (841.89 - width(text, size)) / 2;
    for (const run of runs(text)) {
      const font = fontFor(run);
      if (isBangla(run)) {
        // pdf-lib drawText maps shaped glyph IDs but discards GPOS offsets and
        // advances. Position Indic marks/conjuncts explicitly in the embedded
        // full font so Bangla names retain their real typography.
        bangla.encodeText(run);
        const fontKey = page.node.newFontDictionary(bangla.name, bangla.ref);
        const shaped = shapingFont.layout(run);
        const scale = size / shapingFont.unitsPerEm;
        let penX = 0,
          penY = 0;
        page.pushOperators(
          beginText(),
          setFillingColor(color),
          setFontAndSize(fontKey, size),
        );
        shaped.glyphs.forEach((glyph, index) => {
          const position = shaped.positions[index];
          page.pushOperators(
            setTextMatrix(
              1,
              0,
              0,
              1,
              x + (penX + position.xOffset) * scale,
              y + (penY + position.yOffset) * scale,
            ),
            showText(PDFHexString.of(glyph.id.toString(16).padStart(4, "0"))),
          );
          penX += position.xAdvance;
          penY += position.yAdvance;
        });
        page.pushOperators(endText());
      } else page.drawText(run, { x, y, size, font, color });
      x += runWidth(run, size);
    }
  }
  function fitted(text: string, y: number, initial: number) {
    if (
      !text ||
      text.length > 300 ||
      [...text].some((char) => char.codePointAt(0)! < 32)
    )
      throw new Error("Invalid certificate text");
    let size = initial;
    while (size > 12 && width(text, size) > 700) size--;
    if (width(text, size) > 700)
      throw new Error(
        "Certificate text is too long for this layout. Contact support.",
      );
    centered(text, y, size);
  }
  centered("SHIKKHAHUB", 510, 17, teal);
  centered("Certificate of Completion", 444, 35, ink, heading);
  page.drawLine({
    start: { x: 270, y: 420 },
    end: { x: 572, y: 420 },
    thickness: 1,
    color: teal,
  });
  centered("This certifies that", 380, 12, muted);
  fitted(record.student_name, 329, 30);
  centered(
    "has completed the required learning activities for",
    293,
    12,
    muted,
  );
  fitted(record.course_title, 250, 24);
  centered(
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(record.issued_at)),
    195,
    12,
    teal,
  );
  centered(record.certificate_number, 145, 10, muted);
  centered(
    `${origin.replace(/\/$/, "")}/certificates/verify/${record.verification_token}`,
    121,
    9,
    teal,
  );
  centered(
    "Platform course completion. No university endorsement or accreditation is implied.",
    73,
    9,
    muted,
  );
  return pdf.save();
}
