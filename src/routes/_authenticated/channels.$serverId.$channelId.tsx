import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/chat/AppShell";
import { ChatView } from "@/components/chat/ChatView";
import { MemberList, ServerSidebar } from "@/components/chat/sidebars";
import { fetchChannels, qk } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/channels/$serverId/$channelId")({
  component: ChannelPage,
});

function ChannelPage() {
  const { serverId, channelId } = Route.useParams();
  const channels = useQuery({ queryKey: qk.channels(serverId), queryFn: () => fetchChannels(serverId) });
  const channel = channels.data?.find((c) => c.id === channelId);

  return (
    <AppShell sidebar={<ServerSidebar serverId={serverId} activeChannelId={channelId} />}>
      <ChatView
        kind="channel"
        targetId={channelId}
        title={`# ${channel?.name ?? "channel"}`}
        {...(channel?.topic ? { subtitle: channel.topic } : {})}
        placeholder={`Message #${channel?.name ?? "channel"}`}
        aside={<MemberList serverId={serverId} />}
      />
    </AppShell>
  );
}
