import { createClient } from "@supabase/supabase-js";
import { certificateHandler } from "../_shared/certificateHandler.ts";
import type { CertificateSnapshot } from "../_shared/certificatePdf.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const fonts = Promise.all([
  Deno.readFile(
    new URL("../_shared/fonts/NotoSans-Regular.ttf", import.meta.url),
  ),
  Deno.readFile(
    new URL("../_shared/fonts/NotoSansBengali-Regular.ttf", import.meta.url),
  ),
]).then(([latin, bangla]) => ({ latin, bangla }));
Deno.serve(
  certificateHandler({
    origins: (Deno.env.get("APP_ALLOWED_ORIGINS") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    publicOrigin: Deno.env.get("APP_PUBLIC_ORIGIN") || "",
    fonts: () => fonts,
    readRecord: async (authorization, id) => {
      const client = createClient(url, publicKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      });
      const { data: user, error: authError } = await client.auth.getUser();
      if (authError || !user.user) return null;
      const { data, error } = await client.rpc("certificate_download_record", {
        certificate_id: id,
      });
      return error ? null : (data as CertificateSnapshot);
    },
  }),
);
