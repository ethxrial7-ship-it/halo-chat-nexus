import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/chat/AppShell";
import { DmSidebar } from "@/components/chat/sidebars";

export const Route = createFileRoute("/_authenticated/channels/me/")({
  head: () => ({ meta: [
    { title: "Direct messages — Halo's Messages" },
    { name: "description", content: "Open your private messages and group chats on Halo's Messages." },
    { property: "og:title", content: "Direct messages — Halo's Messages" },
    { property: "og:description", content: "Open your private messages and group chats on Halo's Messages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DmHome,
});

function DmHome() {
  return (
    <AppShell sidebar={<DmSidebar />}>
      <div className="flex flex-1 flex-col items-center justify-center halo-glow px-6 text-center">
        <h1 className="font-display text-3xl">Your messages live here</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Start a private message with someone, spin up a group chat, or jump into one of your servers.
        </p>
      </div>
    </AppShell>
  );
}
