import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NotifyInput = {
  kind: "conversation" | "channel";
  targetId: string;
  title: string;
  body: string;
  url: string;
  tag?: string;
  event?: "message" | "call";
};

export const notifyMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: NotifyInput) => {
    if (!data || (data.kind !== "conversation" && data.kind !== "channel")) throw new Error("Invalid target");
    if (typeof data.targetId !== "string" || data.targetId.length === 0) throw new Error("Invalid target id");
    return {
      kind: data.kind,
      targetId: data.targetId,
      title: String(data.title ?? "Halo's Messages").slice(0, 120),
      body: String(data.body ?? "").slice(0, 240),
      url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/channels/me",
      tag: typeof data.tag === "string" ? data.tag.slice(0, 80) : undefined,
      event: data.event === "call" ? ("call" as const) : ("message" as const),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let recipients: string[] = [];

    if (data.kind === "conversation") {
      const { data: rows, error } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", data.targetId);
      if (error) throw error;
      recipients = (rows ?? []).map((r) => r.user_id);
    } else {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("server_id")
        .eq("id", data.targetId)
        .maybeSingle();
      if (channelError) throw channelError;
      if (!channel) return { sent: 0 };
      const { data: rows, error } = await supabase
        .from("server_members")
        .select("user_id")
        .eq("server_id", channel.server_id);
      if (error) throw error;
      recipients = (rows ?? []).map((r) => r.user_id);
    }

    const others = recipients.filter((id) => id !== userId);
    if (others.length === 0) return { sent: 0 };

    const { deliverPush } = await import("@/lib/notify.server");
    return deliverPush(others, {
      title: data.title,
      body: data.body,
      url: data.url,
      ...(data.tag ? { tag: data.tag } : {}),
      kind: data.event,
    });
  });
