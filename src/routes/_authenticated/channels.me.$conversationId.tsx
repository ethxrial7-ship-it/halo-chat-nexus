import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/chat/AppShell";
import { ChatView } from "@/components/chat/ChatView";
import { DmSidebar } from "@/components/chat/sidebars";
import { useSession } from "@/hooks/useAuth";
import { conversationTitle, fetchConversations, qk } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/channels/me/$conversationId")({
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
