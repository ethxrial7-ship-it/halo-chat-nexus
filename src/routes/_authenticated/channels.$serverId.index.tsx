import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { AppShell } from "@/components/chat/AppShell";
import { ServerSidebar } from "@/components/chat/sidebars";
import { fetchChannels, qk } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/channels/$serverId/")({
  component: ServerHome,
});

function ServerHome() {
  const { serverId } = Route.useParams();
  const channels = useQuery({ queryKey: qk.channels(serverId), queryFn: () => fetchChannels(serverId) });
  const first = channels.data?.[0];

  if (first) {
    return <Navigate to="/channels/$serverId/$channelId" params={{ serverId, channelId: first.id }} replace />;
  }

  return (
    <AppShell sidebar={<ServerSidebar serverId={serverId} />}>
      <div className="flex flex-1 flex-col items-center justify-center halo-glow px-6 text-center">
        <h1 className="font-display text-2xl">
          {channels.isLoading ? "Loading server…" : "No channels yet"}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Server admins can create the first text channel from the sidebar.
        </p>
      </div>
    </AppShell>
  );
}
