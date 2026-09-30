import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Paperclip, Phone, Send, X } from "lucide-react";
import { toast } from "sonner";

import { AttachmentBlock, MessageText } from "@/components/chat/MessageContent";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { useCall } from "@/components/chat/CallProvider";
import { useMyProfile, useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMessages,
  formatBytes,
  MAX_ATTACHMENT_BYTES,
  qk,
  sendMessage,
  uploadAttachment,
  type Message,
  type PendingAttachment,
} from "@/lib/chat";
import { notifyMembers } from "@/lib/notify.functions";
import { haloBotReply } from "@/lib/halobot.functions";

function formatTime(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ChatView({
  kind,
  targetId,
  title,
  subtitle,
  headerAction,
  backLink,
  aside,
  placeholder,
  callMembers,
}: {
  kind: "channel" | "conversation";
  targetId: string;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  backLink?: ReactNode;
  aside?: ReactNode;
  placeholder?: string;
  callMembers?: string[];
}) {
  const { data: session } = useSession();
  const { data: myProfile } = useMyProfile();
  const call = useCall();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: qk.messages(kind, targetId),
    queryFn: () => fetchMessages(kind, targetId),
  });

  useEffect(() => {
    const column = kind === "channel" ? "channel_id" : "conversation_id";
    const channel = supabase
      .channel(`messages-${kind}-${targetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `${column}=eq.${targetId}` },
        () => {
          qc.invalidateQueries({ queryKey: qk.messages(kind, targetId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [kind, targetId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const handleFile = async (file: File | undefined | null) => {
    if (!file || !userId) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`"${file.name}" is ${formatBytes(file.size)} — the limit is 100 MB`);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file, userId);
      setPending(uploaded);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const send = useMutation({
    mutationFn: async () => {
      const content = draft.trim();
      if ((!content && !pending) || !userId) return;
      if (content.length > 2000) throw new Error("Message is too long (2000 characters max)");
      const attachment = pending;
      setDraft("");
      setPending(null);
      await sendMessage(kind, targetId, content, userId, attachment);
      if (/halo chat/i.test(content)) {
        void haloBotReply({ data: { kind, targetId, content } })
          .then(() => qc.invalidateQueries({ queryKey: qk.messages(kind, targetId) }))
          .catch(() => toast.error("Halo AI couldn't reply right now"));
      }
      const senderName = myProfile?.display_name || myProfile?.username || "Someone";
      try {
        await notifyMembers({
          data: {
            kind: kind === "channel" ? "channel" : "conversation",
            targetId,
            title: kind === "channel" ? `${senderName} in ${title}` : senderName,
            body: content || (attachment ? `Sent ${attachment.name}` : "New message"),
            url: window.location.pathname,
            tag: `${kind}-${targetId}`,
          },
        });
      } catch {
        /* notifications are best effort */
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.messages(kind, targetId) }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = messages.data ?? [];
  const canSend = (draft.trim().length > 0 || !!pending) && !uploading;

  return (
    <div className="flex min-h-0 flex-1">
      <div
        className="flex min-w-0 flex-1 flex-col"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:px-4">
          {backLink ? <div className="md:hidden">{backLink}</div> : null}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {kind === "conversation" && callMembers ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={call.inCall(targetId) ? "You are in this call" : "Start a voice call"}
                disabled={call.inCall(targetId)}
                onClick={() => void call.startCall(targetId, title, callMembers)}
              >
                <Phone className="h-4 w-4" />
              </Button>
            ) : null}
            {headerAction}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto scroll-slim">
          <div className="flex flex-col gap-0.5 px-2 py-4 md:px-4">
            {list.length === 0 && !messages.isLoading ? (
              <div className="py-16 text-center">
                <p className="font-display text-xl">This is the very beginning.</p>
                <p className="mt-1 text-sm text-muted-foreground">Send the first message to get things going.</p>
              </div>
            ) : null}
            {list.map((message, index) => (
              <MessageRow key={message.id} message={message} previous={list[index - 1]} myId={userId} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {dragging ? (
          <div className="mx-3 mb-2 rounded-xl border border-dashed border-primary px-4 py-3 text-center text-sm text-primary md:mx-4">
            Drop a file to attach it (up to 100 MB)
          </div>
        ) : null}

        {pending || uploading ? (
          <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 md:mx-4">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Uploading…</span>
              </>
            ) : pending ? (
              <>
                <Paperclip className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{pending.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(pending.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  aria-label="Remove attachment"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <form
          className="flex shrink-0 items-end gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-4 md:pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Attach a file"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <textarea
            value={draft}
            rows={1}
            maxLength={2000}
            placeholder={placeholder ?? "Message…"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send.mutate();
              }
            }}
            className="max-h-40 min-h-11 w-full resize-none rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!canSend}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      {aside}
    </div>
  );
}

function MessageRow({
  message,
  previous,
  myId,
}: {
  message: Message;
  previous?: Message | undefined;
  myId?: string | undefined;
}) {
  const grouped =
    (previous?.bot_name ?? null) === (message.bot_name ?? null) &&
    previous?.author_id === message.author_id &&
    new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60 * 1000;

  const bot = message.bot_name;
  const name = bot || message.profiles?.display_name || message.profiles?.username || "Unknown";

  return (
    <div className={`group flex gap-3 rounded-lg px-2 hover:bg-surface/60 ${grouped ? "py-0.5" : "mt-3 py-1"}`}>
      <div className="w-9 shrink-0">
        {grouped ? null : bot ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground halo-glow">
            AI
          </span>
        ) : (
          <UserAvatar profile={message.profiles} size={36} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {grouped ? null : (
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: bot ? undefined : (message.profiles?.accent_color ?? undefined) }}
            >
              {name}
              {bot ? " · bot" : message.author_id === myId ? " (you)" : ""}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatTime(message.created_at)}</span>
          </div>
        )}
        <MessageText content={message.content} />
        <AttachmentBlock message={message} />
      </div>
    </div>
  );
}
