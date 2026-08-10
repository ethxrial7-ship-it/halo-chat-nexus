import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWebPush, type PushTarget } from "@/lib/webpush.server";

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  kind?: "message" | "call";
};

export async function deliverPush(userIds: string[], payload: NotificationPayload) {
  if (userIds.length === 0) return { sent: 0 };

  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error) throw error;

  const targets = (data ?? []) as PushTarget[];
  const dead = await sendWebPush(targets, payload);
  if (dead.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return { sent: targets.length - dead.length };
}
