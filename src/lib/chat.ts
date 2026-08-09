import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  bio: string;
  status: string;
};

export type Server = {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  invite_code: string;
};

export type Channel = {
  id: string;
  server_id: string;
  name: string;
  topic: string;
  position: number;
};

export type Message = {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  author_id: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_type: string | null;
  profiles: Profile | null;
};

export type PendingAttachment = {
  path: string;
  name: string;
  size: number;
  type: string;
};

export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;


export type Conversation = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_by: string;
  members: Profile[];
};

const PROFILE_COLS = "id, username, display_name, avatar_url, accent_color, bio, status";

export const qk = {
  session: ["session"] as const,
  profile: (id?: string) => ["profile", id] as const,
  servers: ["servers"] as const,
  server: (id: string) => ["server", id] as const,
  channels: (serverId: string) => ["channels", serverId] as const,
  serverMembers: (serverId: string) => ["server-members", serverId] as const,
  conversations: ["conversations"] as const,
  messages: (kind: string, id: string) => ["messages", kind, id] as const,
};

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchMyServers(): Promise<Server[]> {
  const { data, error } = await supabase
    .from("servers")
    .select("id, name, icon_url, owner_id, invite_code")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Server[];
}

export async function fetchChannels(serverId: string): Promise<Channel[]> {
  const { data, error } = await supabase
    .from("channels")
    .select("id, server_id, name, topic, position")
    .eq("server_id", serverId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Channel[];
}

export async function fetchServerMembers(serverId: string) {
  const { data, error } = await supabase
    .from("server_members")
    .select(`role, user_id, profiles!server_members_profile_fkey(${PROFILE_COLS})`)
    .eq("server_id", serverId);
  if (error) throw error;
  return ((data ?? []) as unknown as { role: string; user_id: string; profiles: Profile | null }[])
    .filter((m) => m.profiles)
    .map((m) => ({ role: m.role, profile: m.profiles as Profile }));
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, is_group, name, created_by, created_at, conversation_members(user_id, profiles!conversation_members_profile_fkey(${PROFILE_COLS}))`,
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as {
    id: string;
    is_group: boolean;
    name: string | null;
    created_by: string;
    conversation_members: { user_id: string; profiles: Profile | null }[];
  }[]).map((c) => ({
    id: c.id,
    is_group: c.is_group,
    name: c.name,
    created_by: c.created_by,
    members: c.conversation_members.map((m) => m.profiles).filter(Boolean) as Profile[],
  }));
}

export async function fetchMessages(kind: "channel" | "conversation", id: string): Promise<Message[]> {
  const column = kind === "channel" ? "channel_id" : "conversation_id";
  const { data, error } = await supabase
    .from("messages")
    .select(
      `id, content, created_at, edited_at, author_id, attachment_path, attachment_name, attachment_size, attachment_type, profiles!messages_author_profile_fkey(${PROFILE_COLS})`,
    )
    .eq(column, id)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function uploadAttachment(file: File, userId: string): Promise<PendingAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Files must be 100 MB or smaller");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";
  const path = `${userId}/${crypto.randomUUID()}/${safeName}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return { path, name: file.name, size: file.size, type: file.type || "application/octet-stream" };
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function sendMessage(
  kind: "channel" | "conversation",
  id: string,
  content: string,
  authorId: string,
  attachment?: PendingAttachment | null,
) {
  const { error } = await supabase.from("messages").insert({
    author_id: authorId,
    content,
    channel_id: kind === "channel" ? id : null,
    conversation_id: kind === "conversation" ? id : null,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_size: attachment?.size ?? null,
    attachment_type: attachment?.type ?? null,
  });
  if (error) throw error;
}

export function inviteLink(code: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/invite/${code}`;
}


export async function searchProfiles(term: string, excludeId: string): Promise<Profile[]> {
  const clean = term.trim();
  if (!clean) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
    .neq("id", excludeId)
    .limit(10);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export function conversationTitle(conversation: Conversation, myId: string) {
  if (conversation.name) return conversation.name;
  const others = conversation.members.filter((m) => m.id !== myId);
  if (others.length === 0) return "Just you";
  return others.map((o) => o.display_name || o.username).join(", ");
}

export function initials(name: string) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}
