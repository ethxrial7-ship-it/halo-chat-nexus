import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Compass, LogOut, Plus, Settings, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { CreateServerDialog, JoinServerDialog } from "@/components/chat/dialogs";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMyProfile, useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyServers, initials, qk } from "@/lib/chat";
import { cn } from "@/lib/utils";

function ServerRail({ userId }: { userId: string }) {
  const servers = useQuery({ queryKey: qk.servers, queryFn: fetchMyServers });
  const params = useParams({ strict: false }) as { serverId?: string };
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={120}>
      <nav className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r border-border bg-background py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/channels/me"
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-primary transition-all hover:rounded-xl",
                !params.serverId && "rounded-xl shadow-halo",
              )}
              aria-label="Direct messages"
            >
              <Sparkles className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Direct messages</TooltipContent>
        </Tooltip>

        <div className="my-1 h-px w-8 bg-border" />

        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto scroll-slim">
          {servers.data?.map((server) => (
            <Tooltip key={server.id}>
              <TooltipTrigger asChild>
                <Link
                  to="/channels/$serverId"
                  params={{ serverId: server.id }}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-surface font-display text-sm font-semibold transition-all hover:rounded-xl",
                    params.serverId === server.id && "rounded-xl ring-2 ring-primary",
                  )}
                >
                  {server.icon_url ? (
                    <img src={server.icon_url} alt={server.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(server.name)
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{server.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-success transition-all hover:rounded-xl"
              aria-label="Create a server"
            >
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Create a server</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setJoinOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-muted-foreground transition-all hover:rounded-xl hover:text-foreground"
              aria-label="Join a server"
            >
              <Compass className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Join with invite</TooltipContent>
        </Tooltip>
      </nav>

      <CreateServerDialog open={createOpen} onOpenChange={setCreateOpen} userId={userId} />
      <JoinServerDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </TooltipProvider>
  );
}

export function UserPanel() {
  const { data: profile } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border bg-background/60 px-2 py-2">
      <UserAvatar profile={profile ?? null} size={32} showStatus />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{profile?.display_name || profile?.username || "…"}</p>
        <p className="truncate text-xs text-muted-foreground">@{profile?.username ?? ""}</p>
      </div>
      <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Profile settings">
        <Link to="/settings">
          <Settings className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut} aria-label="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AppShell({
  sidebar,
  children,
  mobileView = "sidebar",
}: {
  sidebar: ReactNode;
  children: ReactNode;
  mobileView?: "sidebar" | "content";
}) {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const showSidebar = mobileView === "sidebar";

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {userId ? (
        <div className={cn(showSidebar ? "flex" : "hidden md:flex")}>
          <ServerRail userId={userId} />
        </div>
      ) : null}
      <aside
        className={cn(
          "min-w-0 flex-1 flex-col border-r border-sidebar-border bg-sidebar md:flex md:w-60 md:flex-none md:shrink-0",
          showSidebar ? "flex" : "hidden",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
        <UserPanel />
      </aside>
      <main className={cn("min-w-0 flex-1 flex-col md:flex", showSidebar ? "hidden" : "flex")}>{children}</main>
    </div>
  );
}

