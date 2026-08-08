import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halo's Messages — servers, DMs and group chats" },
      {
        name: "description",
        content:
          "Halo's Messages is a real-time chat home for your communities: servers with channels, private messages, group chats and customizable profiles.",
      },
      { property: "og:title", content: "Halo's Messages — servers, DMs and group chats" },
      {
        property: "og:description",
        content: "Real-time servers, private messages and group chats with customizable profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/channels/me", replace: true });
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center halo-glow px-6 py-16 text-center">
      <p className="font-display text-xs uppercase tracking-[0.4em] text-primary">Halo's Messages</p>
      <h1 className="mt-5 max-w-2xl font-display text-4xl leading-tight sm:text-6xl">
        A warmer place for your people to talk.
      </h1>
      <p className="mt-5 max-w-xl text-base text-muted-foreground">
        Servers with text channels, private messages, group chats and profiles you can make your own — all in
        real time.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          Create your account
        </button>
        <button
          onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
          className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
        >
          Sign in
        </button>
      </div>

      <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {[
          { title: "Servers", body: "Create a server, add channels, invite friends with a code." },
          { title: "Private & group chats", body: "One-to-one DMs or a group with everyone at once." },
          { title: "Your profile", body: "Display name, avatar, bio, accent colour and status." },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-border bg-card p-5 text-left">
            <h2 className="font-display text-lg">{card.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
