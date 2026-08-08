import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMessages, qk, sendMessage, type Message } from "@/lib/chat";

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
  aside,
  placeholder,
}: {
  kind: "channel" | "conversation";
  targetId: string;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  aside?: ReactNode;
  placeholder?: string;
}) {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
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

  const send = useMutation({
    mutationFn: async () => {
      const content = draft.trim();
      if (!content || !userId) return;
      if (content.length > 2000) throw new Error("Message is too long (2000 characters max)");
      setDraft("");
      await sendMessage(kind, targetId, content, userId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.messages(kind, targetId) }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = messages.data ?? [];

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="ml-auto">{headerAction}</div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto scroll-slim">
          <div className="flex flex-col gap-0.5 px-4 py-4">
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

        <form
          className="flex shrink-0 items-end gap-2 px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
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
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!draft.trim()}>
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
    previous?.author_id === message.author_id &&
    new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60 * 1000;

  const name = message.profiles?.display_name || message.profiles?.username || "Unknown";

  return (
    <div className={`group flex gap-3 rounded-lg px-2 hover:bg-surface/60 ${grouped ? "py-0.5" : "mt-3 py-1"}`}>
      <div className="w-9 shrink-0">
        {grouped ? null : <UserAvatar profile={message.profiles} size={36} />}
      </div>
      <div className="min-w-0 flex-1">
        {grouped ? null : (
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: message.profiles?.accent_color ?? undefined }}
            >
              {name}
              {message.author_id === myId ? " (you)" : ""}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatTime(message.created_at)}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {message.content}
        </p>
      </div>
    </div>
  );
}
