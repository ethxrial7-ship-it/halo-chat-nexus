import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsAdmin } from "@/hooks/useModeration";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Admin panel — Halo's Messages" },
    { name: "description", content: "Moderate users and enforce the rules on Halo's Messages." },
    { property: "og:title", content: "Admin panel — Halo's Messages" },
    { property: "og:description", content: "Moderate users and enforce the rules on Halo's Messages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

const COLS = "id, username, display_name, avatar_url, accent_color, bio, status";

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", term],
    enabled: isAdmin === true,
    queryFn: async () => {
      let q = supabase.from("profiles").select(COLS).order("created_at", { ascending: false }).limit(100);
      const t = term.trim().replace(/[%,()]/g, "");
      if (t) q = q.or(`username.ilike.%${t}%,display_name.ilike.%${t}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
  const bans = useQuery({
    queryKey: ["admin-bans"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_bans").select("user_id, reason");
      if (error) throw error;
      return new Map((data ?? []).map((b) => [b.user_id, b.reason]));
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-bans"] });
  const ban = useMutation({
    mutationFn: async (u: Profile) => {
      const reason = window.prompt(`Reason for banning @${u.username}?`, "Breaking the rules");
      if (reason === null) return false;
      const { error } = await supabase.rpc("admin_ban_user", { _user_id: u.id, _reason: reason });
      if (error) throw error;
      return true;
    },
    onSuccess: (done) => { if (done) { toast.success("User banned"); refresh(); } },
    onError: (e: Error) => toast.error(e.message),
  });
  const unban = useMutation({
    mutationFn: async (u: Profile) => {
      const { error } = await supabase.rpc("admin_unban_user", { _user_id: u.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User unbanned"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const wipe = useMutation({
    mutationFn: async (u: Profile) => {
      if (!window.confirm(`Delete all messages from @${u.username}?`)) return null;
      const { data, error } = await supabase.rpc("admin_delete_user_messages", { _user_id: u.id });
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => { if (n !== null) { toast.success(`Deleted ${n} messages`); qc.invalidateQueries({ queryKey: ["messages"] }); } },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/channels/me"><ArrowLeft className="mr-1 h-4 w-4" /> Back to messages</Link>
        </Button>
        <h1 className="flex items-center gap-2 font-display text-3xl"><ShieldCheck className="h-7 w-7 text-primary" /> Admin panel</h1>
        {isLoading ? (
          <p className="mt-6 text-muted-foreground">Checking access…</p>
        ) : !isAdmin ? (
          <p className="mt-6 text-muted-foreground">You don't have access to this page.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Banned users can still sign in but can't send any messages.</p>
            <Input className="mt-6" placeholder="Search users by name or username" value={term} onChange={(e) => setTerm(e.target.value)} />
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
              {(users.data ?? []).map((u) => {
                const reason = bans.data?.get(u.id);
                const banned = reason !== undefined;
                return (
                  <li key={u.id} className="flex items-center gap-3 p-3">
                    <UserAvatar profile={u} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.display_name || u.username}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{u.username}{banned ? ` · Banned${reason ? `: ${reason}` : ""}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => wipe.mutate(u)} aria-label="Delete messages">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {banned ? (
                      <Button variant="outline" size="sm" onClick={() => unban.mutate(u)}><Undo2 className="mr-1 h-4 w-4" />Unban</Button>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => ban.mutate(u)}><Ban className="mr-1 h-4 w-4" />Ban</Button>
                    )}
                  </li>
                );
              })}
              {users.data?.length === 0 ? <li className="p-4 text-sm text-muted-foreground">No users found.</li> : null}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
