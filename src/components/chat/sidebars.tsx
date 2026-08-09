import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, Hash, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CreateChannelDialog, NewChatDialog } from "@/components/chat/dialogs";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { useSession } from "@/hooks/useAuth";
import {
  conversationTitle,
  fetchChannels,
  fetchConversations,
  fetchMyServers,
  fetchServerMembers,
  inviteLink,
  qk,
  type Conversation,
} from "@/lib/chat";
import { cn } from "@/lib/utils";


function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-4">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {action}
    </div>
  );
}

export function DmSidebar({ activeId }: { activeId?: string }) {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [open, setOpen] = useState(false);
  const conversations = useQuery({ queryKey: qk.conversations, queryFn: fetchConversations });

  const dms = (conversations.data ?? []).filter((c) => !c.is_group);
  const groups = (conversations.data ?? []).filter((c) => c.is_group);

  const row = (conversation: Conversation) => (
    <Link
      key={conversation.id}
      to="/channels/me/$conversationId"
      params={{ conversationId: conversation.id }}
      className={cn(
        "mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        activeId === conversation.id && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      {conversation.is_group ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Users className="h-4 w-4" />
        </span>
      ) : (
        <UserAvatar
          profile={conversation.members.find((m) => m.id !== userId) ?? null}
          size={32}
          showStatus
        />
      )}
      <span className="truncate">{conversationTitle(conversation, userId ?? "")}</span>
    </Link>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <span className="font-display text-base font-semibold">Halo's Messages</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim pb-3">
        <div className="px-2 pt-3">
          <button
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4 text-primary" />
            New message
          </button>
        </div>

        <SectionHeader label="Direct messages" />
        {dms.length === 0 ? (
          <p className="px-3 text-xs text-muted-foreground">No private messages yet.</p>
        ) : (
          dms.map(row)
        )}

        <SectionHeader label="Group chats" />
        {groups.length === 0 ? (
          <p className="px-3 text-xs text-muted-foreground">No group chats yet.</p>
        ) : (
          groups.map(row)
        )}
      </div>
      {userId ? <NewChatDialog open={open} onOpenChange={setOpen} userId={userId} /> : null}
    </div>
  );
}

export function ServerSidebar({ serverId, activeChannelId }: { serverId: string; activeChannelId?: string }) {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [open, setOpen] = useState(false);
  const servers = useQuery({ queryKey: qk.servers, queryFn: fetchMyServers });
  const channels = useQuery({ queryKey: qk.channels(serverId), queryFn: () => fetchChannels(serverId) });
  const members = useQuery({ queryKey: qk.serverMembers(serverId), queryFn: () => fetchServerMembers(serverId) });

  const server = servers.data?.find((s) => s.id === serverId);
  const myRole = members.data?.find((m) => m.profile.id === userId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <span className="truncate font-display text-base font-semibold">{server?.name ?? "Server"}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim pb-3">
        <SectionHeader
          label="Text channels"
          action={
            canManage ? (
              <button
                onClick={() => setOpen(true)}
                aria-label="Create channel"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : null
          }
        />
        {channels.data?.map((channel) => (
          <Link
            key={channel.id}
            to="/channels/$serverId/$channelId"
            params={{ serverId, channelId: channel.id }}
            className={cn(
              "mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              activeChannelId === channel.id && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{channel.name}</span>
          </Link>
        ))}

        {server ? (
          <>
            <SectionHeader label="Invite link" />
            <div className="mx-2 rounded-lg bg-sidebar-accent px-3 py-2">
              <code className="block break-all text-xs text-primary">{inviteLink(server.invite_code)}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink(server.invite_code));
                  toast.success("Invite link copied — paste it in any chat");
                }}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy invite link
              </button>
            </div>
          </>
        ) : null}

      </div>
      <CreateChannelDialog open={open} onOpenChange={setOpen} serverId={serverId} />
    </div>
  );
}

export function MemberList({ serverId }: { serverId: string }) {
  const members = useQuery({ queryKey: qk.serverMembers(serverId), queryFn: () => fetchServerMembers(serverId) });

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-l border-border bg-sidebar lg:flex">
      <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Members — {members.data?.length ?? 0}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim px-2 pb-3">
        {members.data?.map(({ profile, role }) => (
          <div key={profile.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <UserAvatar profile={profile} size={30} showStatus />
            <div className="min-w-0">
              <p className="truncate text-sm" style={{ color: profile.accent_color }}>
                {profile.display_name || profile.username}
              </p>
              {role !== "member" ? <p className="text-[11px] capitalize text-muted-foreground">{role}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
