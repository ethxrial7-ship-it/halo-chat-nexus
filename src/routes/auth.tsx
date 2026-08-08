import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Halo's Messages" },
      {
        name: "description",
        content: "Sign in or create your Halo's Messages account to chat in servers, DMs and group chats.",
      },
      { property: "og:title", content: "Sign in — Halo's Messages" },
      { property: "og:description", content: "Create your account and start chatting on Halo's Messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { mode?: "signup" | "signin" } =>
    search['mode'] === "signup" ? { mode: "signup" } : {},
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/channels/me", replace: true });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignUp) {
        const clean = username.trim().toLowerCase();
        if (!/^[a-z0-9_.]{3,24}$/.test(clean)) {
          throw new Error("Username must be 3-24 characters: letters, numbers, dot or underscore");
        }
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: clean, display_name: clean },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      await qc.invalidateQueries();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/channels/me", replace: true });
      } else {
        toast.success("Check your email to confirm your account.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center halo-glow px-4 py-12">
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">Halo's Messages</p>
        <h1 className="mt-3 font-display text-3xl">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp
            ? "Pick a username — it's how friends will find you."
            : "Sign in to your servers, DMs and group chats."}
        </p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {isSignUp ? (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="halo_fan"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Just a second…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <button
          onClick={() => setIsSignUp((v) => !v)}
          className="mt-6 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </main>
  );
}
