import { cn } from "@/lib/utils";
import { initials, type Profile } from "@/lib/chat";

export function UserAvatar({
  profile,
  size = 36,
  className,
  showStatus = false,
}: {
  profile: Pick<Profile, "display_name" | "username" | "avatar_url" | "accent_color" | "status"> | null;
  size?: number;
  className?: string;
  showStatus?: boolean;
}) {
  const name = profile?.display_name || profile?.username || "?";
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-background"
          style={{ backgroundColor: profile?.accent_color || "#7c5cff", fontSize: size * 0.36 }}
        >
          {initials(name)}
        </span>
      )}
      {showStatus ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-sidebar",
            profile?.status === "offline"
              ? "bg-muted-foreground"
              : profile?.status === "idle"
                ? "bg-primary"
                : profile?.status === "dnd"
                  ? "bg-destructive"
                  : "bg-success",
          )}
          style={{ width: size * 0.32, height: size * 0.32 }}
        />
      ) : null}
    </span>
  );
}
