import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BGgvckuGziEQB6oiu-t1RO3f6ZEvHFEPvnoEZh1Z2QJiP6H_QBavxyeYaVlrTmevYXEu89viIbDHZnLtwlmprZE";

const SW_URL = "/push-sw.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function keyToBase64(subscription: PushSubscription, name: "p256dh" | "auth") {
  const key = subscription.getKey(name);
  if (!key) return "";
  let binary = "";
  for (const byte of new Uint8Array(key)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export async function isPushEnabled() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  return !!subscription;
}

export async function enablePush(userId: string) {
  if (!pushSupported()) throw new Error("This browser can't show notifications");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were blocked in your browser settings");

  const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keyToBase64(subscription, "p256dh"),
      auth: keyToBase64(subscription, "auth"),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  return true;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
}
