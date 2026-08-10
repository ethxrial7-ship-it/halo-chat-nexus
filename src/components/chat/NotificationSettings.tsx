import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";
import { disablePush, enablePush, isPushEnabled, notificationPermission } from "@/lib/push";

export function NotificationSettings() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPermission(notificationPermission());
    void isPushEnabled().then(setEnabled);
  }, []);

  const toggle = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        toast.success("Notifications turned off on this device");
      } else {
        await enablePush(userId);
        setEnabled(true);
        toast.success("Notifications are on — you'll be alerted even when the tab is closed");
      }
      setPermission(notificationPermission());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change notifications");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="mt-6 rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-panel)" }}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get a sound and an alert for new messages and incoming calls, even when Halo's Messages is closed.
          </p>
          {permission === "unsupported" ? (
            <p className="mt-3 text-sm text-destructive">This browser doesn't support push notifications.</p>
          ) : permission === "denied" ? (
            <p className="mt-3 text-sm text-destructive">
              Notifications are blocked in your browser settings for this site — allow them there first.
            </p>
          ) : (
            <Button className="mt-4" onClick={() => void toggle()} disabled={busy || !userId}>
              {busy ? "Working…" : enabled ? "Turn off notifications" : "Turn on notifications"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
