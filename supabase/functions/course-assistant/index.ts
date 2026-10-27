import { createClient } from "@supabase/supabase-js";
import { assistantHandler } from "../_shared/assistantHandler.ts";

const clientFor = (authorization: string) => createClient(
  Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
);

Deno.serve(assistantHandler({
  origins: (Deno.env.get("APP_ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean),
  endpoint: Deno.env.get("AI_CHAT_COMPLETIONS_URL"),
  apiKey: Deno.env.get("AI_API_KEY"),
  model: Deno.env.get("AI_MODEL"),
  authorize: async authorization => {
    const { data, error } = await clientFor(authorization).auth.getUser();
    return !error && !!data.user;
  },
  courseContext: async (authorization, courseId) => {
    // RLS governs both course metadata and lesson content; no service role.
    const client = clientFor(authorization);
    const { data: course, error } = await client.from("courses")
      .select("title, description, category, difficulty").eq("id", courseId).single();
    if (error || !course) return null;
    const { data: modules, error: moduleError } = await client.from("modules")
      .select("title, description, lessons(title, type, content)")
      .eq("course_id", courseId).order("sort_order").limit(30);
    if (moduleError) return null;
    return JSON.stringify({ course, modules }).slice(0, 24_000);
  },
}));
