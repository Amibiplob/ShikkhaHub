import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, courseId } = await req.json();

    // Fetch course context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let courseContext = "";
    if (courseId) {
      const { data: course } = await supabase
        .from("courses")
        .select("title, description, category, difficulty")
        .eq("id", courseId)
        .single();

      const { data: modules } = await supabase
        .from("modules")
        .select("title, description, lessons(title, type, content)")
        .eq("course_id", courseId)
        .order("sort_order");

      if (course) {
        courseContext = `\n\nCOURSE CONTEXT:\nTitle: ${course.title}\nDescription: ${course.description || "N/A"}\nCategory: ${course.category || "N/A"}\nDifficulty: ${course.difficulty || "N/A"}`;
        if (modules?.length) {
          courseContext += "\n\nMODULES & LESSONS:";
          for (const mod of modules) {
            courseContext += `\n\n## ${mod.title}`;
            if (mod.description) courseContext += `\n${mod.description}`;
            for (const lesson of (mod as any).lessons || []) {
              courseContext += `\n- ${lesson.title} (${lesson.type})`;
              if (lesson.content) courseContext += `\n  Content: ${lesson.content.substring(0, 500)}`;
            }
          }
        }
      }
    }

    const systemPrompt = `You are a helpful AI teaching assistant for an online learning platform. You help students understand course material, answer questions, explain concepts, and provide study guidance.

Be concise, encouraging, and educational. Use markdown formatting for clarity. If a student asks something outside the course scope, gently redirect them.${courseContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("course-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
