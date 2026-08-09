import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchChannels } from "@/lib/chat";

export const PENDING_INVITE_KEY = "halo:pending-invite";

export const Route = createFileRoute("/invite/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Server invite — Halo's Messages" },
      { name: "description", content: "You've been invited to join a server on Halo's Messages." },
      { property: "og:title", content: "Server invite — Halo's Messages" },
      { property: "og:description", content: "Accept your invite and start chatting on Halo's Messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        sessionStorage.setItem(PENDING_INVITE_KEY, code);
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: serverId, error: joinError } = await supabase.rpc("join_server_by_invite", { _code: code });
      if (!active) return;
      if (joinError || !serverId) {
        setError(joinError?.message ?? "That invite link is not valid.");
        return;
      }
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      await qc.invalidateQueries();
      const channels = await fetchChannels(serverId as string);
      const first = channels[0];
      if (first) {
        navigate({
          to: "/channels/$serverId/$channelId",
          params: { serverId: serverId as string, channelId: first.id },
          replace: true,
        });
      } else {
        navigate({ to: "/channels/$serverId", params: { serverId: serverId as string }, replace: true });
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [code, navigate, qc]);

  return (
    <main className="flex min-h-screen items-center justify-center halo-glow px-4 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-2xl">{error ? "Invite not valid" : "Joining server…"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "Hang tight, we're adding you to the server."}
        </p>
        {error ? (
          <Button asChild className="mt-6">
            <Link to="/channels/me">Back to Halo's Messages</Link>
          </Button>
        ) : null}
      </div>
    </main>
  );
}
