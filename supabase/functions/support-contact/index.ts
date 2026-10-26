import { createClient } from "@supabase/supabase-js";
import { supportHandler } from "../_shared/supportHandler.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
Deno.serve(
  supportHandler({
    secret: Deno.env.get("SUPPORT_CHALLENGE_SECRET") || "",
    origins: (Deno.env.get("APP_ALLOWED_ORIGINS") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    authenticate: async (authorization) => {
      const client = createClient(url, publicKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      });
      const { data, error } = await client.auth.getUser();
      return error ? null : data.user?.id || null;
    },
    intake: async (data) => {
      const { data: id, error } = await service.rpc("support_intake", data);
      if (error)
        throw new Error(
          error.message.includes("limit reached")
            ? "limit reached"
            : "Intake failed",
        );
      return id as string;
    },
  }),
);
