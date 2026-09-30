import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/chat/AppShell";
import { ChatView } from "@/components/chat/ChatView";
import { MemberList, ServerSidebar } from "@/components/chat/sidebars";
import { fetchChannels, qk } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/channels/$serverId/$channelId")({
  head: () => ({ meta: [
    { title: "Server chat — Halo's Messages" },
    { name: "description", content: "Chat in a community channel on Halo's Messages." },
    { property: "og:title", content: "Server chat — Halo's Messages" },
    { property: "og:description", content: "Chat in a community channel on Halo's Messages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ChannelPage,
});

function ChannelPage() {
  const { serverId, channelId } = Route.useParams();
  const channels = useQuery({ queryKey: qk.channels(serverId), queryFn: () => fetchChannels(serverId) });
  const channel = channels.data?.find((c) => c.id === channelId);

  return (
    <AppShell sidebar={<ServerSidebar serverId={serverId} activeChannelId={channelId} />} mobileView="content">
      <ChatView
        kind="channel"
        targetId={channelId}
        title={`# ${channel?.name ?? "channel"}`}
        {...(channel?.topic ? { subtitle: channel.topic } : {})}
        placeholder={`Message #${channel?.name ?? "channel"}`}
        backLink={
          <Link
            to="/channels/$serverId"
            params={{ serverId }}
            aria-label="Back to channels"
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        }
        aside={<MemberList serverId={serverId} />}
      />
    </AppShell>
  );
}

