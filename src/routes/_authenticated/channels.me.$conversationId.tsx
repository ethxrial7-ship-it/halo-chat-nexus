import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/chat/AppShell";
import { ChatView } from "@/components/chat/ChatView";
import { DmSidebar } from "@/components/chat/sidebars";
import { useSession } from "@/hooks/useAuth";
import { conversationTitle, fetchConversations, qk } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/channels/me/$conversationId")({
  head: () => ({ meta: [
    { title: "Conversation — Halo's Messages" },
    { name: "description", content: "Chat privately with friends on Halo's Messages." },
    { property: "og:title", content: "Conversation — Halo's Messages" },
    { property: "og:description", content: "Chat privately with friends on Halo's Messages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { data: session } = useSession();
  const conversations = useQuery({ queryKey: qk.conversations, queryFn: fetchConversations });
  const conversation = conversations.data?.find((c) => c.id === conversationId);
  const myId = session?.user.id ?? "";

  const title = conversation ? conversationTitle(conversation, myId) : "Conversation";
  const subtitle = conversation?.is_group
    ? `${conversation.members.length} members`
    : conversation
      ? `@${conversation.members.find((m) => m.id !== myId)?.username ?? ""}`
      : undefined;

  return (
    <AppShell sidebar={<DmSidebar activeId={conversationId} />} mobileView="content">
      <ChatView
        kind="conversation"
        targetId={conversationId}
        title={title}
        {...(subtitle ? { subtitle } : {})}
        placeholder={`Message ${title}`}
        callMembers={conversation?.members.map((m) => m.id) ?? []}
        backLink={
          <Link
            to="/channels/me"
            aria-label="Back to messages"
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        }
      />
    </AppShell>
  );
}
