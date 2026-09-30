import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HALO_LINK = "https://halo-chat-nexus.lovable.app";
export const HALO_BOT_NAME = "Halo AI";

export const haloBotReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { kind: "channel" | "conversation"; targetId: string; content: string }) => {
    if (!data || (data.kind !== "channel" && data.kind !== "conversation")) throw new Error("Invalid target");
    if (typeof data.targetId !== "string" || !data.targetId) throw new Error("Invalid target id");
    const content = String(data.content ?? "").slice(0, 2000);
    if (!/halo chat/i.test(content)) throw new Error("No trigger phrase");
    return { kind: data.kind, targetId: data.targetId, content };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify the caller can see this chat (RLS scoped to the user).
    const col = data.kind === "channel" ? "channels" : "conversations";
    const { data: target } = await supabase.from(col).select("id").eq("id", data.targetId).maybeSingle();
    if (!target) throw new Error("Chat not found");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      maxRetries: 0,
      system:
        "You are Halo AI, a friendly assistant inside the Halo's Messages chat app. Reply to the user's message briefly (under 80 words), casually, in plain text. Do not include any links.",
      prompt: data.content,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = (await result.text).trim();
    const reply = `${text}\n\n${HALO_LINK}`.slice(0, 2000);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("messages").insert({
      author_id: userId,
      bot_name: HALO_BOT_NAME,
      content: reply,
      channel_id: data.kind === "channel" ? data.targetId : null,
      conversation_id: data.kind === "conversation" ? data.targetId : null,
    });
    if (error) throw error;
    return { ok: true };
  });
