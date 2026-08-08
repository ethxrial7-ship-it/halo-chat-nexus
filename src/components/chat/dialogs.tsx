import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { qk, searchProfiles, type Profile } from "@/lib/chat";

export function CreateServerDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [name, setName] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: async () => {
      const clean = name.trim();
      if (clean.length < 2) throw new Error("Server name must be at least 2 characters");
      const { data: server, error } = await supabase
        .from("servers")
        .insert({ name: clean.slice(0, 60), owner_id: userId })
        .select("id")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase
        .from("server_members")
        .insert({ server_id: server.id, user_id: userId, role: "owner" });
      if (memberError) throw memberError;
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .insert({ server_id: server.id, name: "general", topic: "Say hello 👋" })
        .select("id")
        .single();
      if (channelError) throw channelError;
      return { serverId: server.id, channelId: channel.id };
    },
    onSuccess: ({ serverId, channelId }) => {
      qc.invalidateQueries({ queryKey: qk.servers });
      onOpenChange(false);
      setName("");
      navigate({ to: "/channels/$serverId/$channelId", params: { serverId, channelId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover">
        <DialogHeader>
          <DialogTitle>Create a server</DialogTitle>
          <DialogDescription>Your own space for channels, friends and chaos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="server-name">Server name</Label>
          <Input
            id="server-name"
            value={name}
            maxLength={60}
            placeholder="Halo HQ"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JoinServerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [code, setCode] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const join = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("join_server_by_invite", { _code: code.trim().toLowerCase() });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (serverId) => {
      await qc.invalidateQueries({ queryKey: qk.servers });
      onOpenChange(false);
      setCode("");
      toast.success("Joined the server");
      navigate({ to: "/channels/$serverId", params: { serverId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover">
        <DialogHeader>
          <DialogTitle>Join a server</DialogTitle>
          <DialogDescription>Paste an invite code a friend shared with you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="invite-code">Invite code</Label>
          <Input
            id="invite-code"
            value={code}
            placeholder="a1b2c3d4e5"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => join.mutate()} disabled={join.isPending || !code.trim()}>
            {join.isPending ? "Joining…" : "Join server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  serverId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  serverId: string;
}) {
  const [name, setName] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: async () => {
      const clean = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
      if (!clean) throw new Error("Pick a channel name");
      const { data, error } = await supabase
        .from("channels")
        .insert({ server_id: serverId, name: clean.slice(0, 40) })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (channelId) => {
      qc.invalidateQueries({ queryKey: qk.channels(serverId) });
      onOpenChange(false);
      setName("");
      navigate({ to: "/channels/$serverId/$channelId", params: { serverId, channelId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>Channels keep conversations on topic.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="channel-name">Channel name</Label>
          <Input
            id="channel-name"
            value={name}
            maxLength={40}
            placeholder="announcements"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewChatDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const results = useQuery({
    queryKey: ["profile-search", term, userId],
    queryFn: () => searchProfiles(term, userId),
    enabled: term.trim().length > 0,
  });

  const start = useMutation({
    mutationFn: async () => {
      if (picked.length === 0) throw new Error("Pick at least one person");
      if (picked.length === 1) {
        const { data, error } = await supabase.rpc("start_direct_message", {
          _other_user: picked[0]!.id,
        });
        if (error) throw error;
        return data as string;
      }
      const name = groupName.trim() || picked.map((p) => p.display_name || p.username).join(", ").slice(0, 60);
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({ is_group: true, name, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase.from("conversation_members").insert(
        [userId, ...picked.map((p) => p.id)].map((id) => ({
          conversation_id: conversation.id,
          user_id: id,
        })),
      );
      if (memberError) throw memberError;
      return conversation.id;
    },
    onSuccess: async (conversationId) => {
      await qc.invalidateQueries({ queryKey: qk.conversations });
      onOpenChange(false);
      setPicked([]);
      setTerm("");
      setGroupName("");
      navigate({ to: "/channels/me/$conversationId", params: { conversationId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (profile: Profile) =>
    setPicked((prev) =>
      prev.some((p) => p.id === profile.id) ? prev.filter((p) => p.id !== profile.id) : [...prev, profile],
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            Pick one person for a private message, or several for a group chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={term}
            placeholder="Search by username…"
            onChange={(e) => setTerm(e.target.value)}
            autoFocus
          />

          {picked.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {picked.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                >
                  <UserAvatar profile={p} size={18} />
                  {p.display_name || p.username} ✕
                </button>
              ))}
            </div>
          ) : null}

          <div className="max-h-56 space-y-1 overflow-y-auto scroll-slim">
            {results.data?.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <UserAvatar profile={p} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.display_name || p.username}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                </span>
              </button>
            ))}
            {term.trim() && results.data?.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No one found.</p>
            ) : null}
          </div>

          {picked.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="group-name">Group name (optional)</Label>
              <Input
                id="group-name"
                value={groupName}
                maxLength={60}
                placeholder="Weekend plans"
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => start.mutate()} disabled={start.isPending || picked.length === 0}>
            {picked.length > 1 ? "Create group chat" : "Start chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
