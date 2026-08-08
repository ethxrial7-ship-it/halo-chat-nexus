import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyProfile, useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/chat";

const STATUSES = [
  { value: "online", label: "Online" },
  { value: "idle", label: "Idle" },
  { value: "dnd", label: "Do not disturb" },
  { value: "offline", label: "Invisible" },
];

const COLORS = ["#f5b544", "#7c5cff", "#3ec9a7", "#ff6b6b", "#4aa8ff", "#ff8fd0", "#9ee493"];

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = useSession();
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accent, setAccent] = useState(COLORS[0] as string);
  const [status, setStatus] = useState("online");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setUsername(profile.username);
    setBio(profile.bio);
    setAvatarUrl(profile.avatar_url ?? "");
    setAccent(profile.accent_color);
    setStatus(profile.status);
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_.]{3,24}$/.test(cleanUsername)) {
        throw new Error("Username must be 3-24 characters: letters, numbers, dot or underscore");
      }
      if (displayName.trim().length > 40) throw new Error("Display name must be 40 characters or less");
      if (bio.length > 300) throw new Error("Bio must be 300 characters or less");
      const { error } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          display_name: displayName.trim() || cleanUsername,
          bio: bio.trim(),
          avatar_url: avatarUrl.trim() || null,
          accent_color: accent,
          status,
        })
        .eq("id", session?.user.id ?? "");
      if (error) throw error.code === "23505" ? new Error("That username is taken") : error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile(session?.user.id) });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const preview = {
    display_name: displayName,
    username,
    avatar_url: avatarUrl || null,
    accent_color: accent,
    status,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/channels/me">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to messages
          </Link>
        </Button>

        <h1 className="font-display text-3xl">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how everyone in Halo's Messages sees you.
        </p>

        <div
          className="mt-8 rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-panel)" }}
        >
          <div className="flex items-center gap-4 border-b border-border pb-6">
            <UserAvatar profile={preview} size={72} showStatus />
            <div className="min-w-0">
              <p className="truncate font-display text-xl" style={{ color: accent }}>
                {displayName || username || "Your name"}
              </p>
              <p className="truncate text-sm text-muted-foreground">@{username}</p>
              {bio ? <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{bio}</p> : null}
            </div>
          </div>

          <div className="grid gap-5 pt-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                maxLength={40}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} maxLength={24} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="avatar">Avatar image URL</Label>
              <Input
                id="avatar"
                value={avatarUrl}
                placeholder="https://…"
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">About me</Label>
              <Textarea
                id="bio"
                value={bio}
                maxLength={300}
                rows={3}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people who you are."
              />
            </div>

            <div className="space-y-2">
              <Label>Accent colour</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccent(color)}
                    aria-label={`Accent ${color}`}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      accent === color ? "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-card" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      status === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
