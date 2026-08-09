import { Link } from "@tanstack/react-router";
import { Download, FileIcon, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { attachmentUrl, formatBytes, type Message } from "@/lib/chat";

const URL_RE = /(https?:\/\/[^\s<]+)/g;

function inviteCodeFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (typeof window !== "undefined" && url.origin !== window.location.origin) return null;
    const match = url.pathname.match(/^\/invite\/([a-zA-Z0-9-]+)\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function MessageText({ content }: { content: string }) {
  if (!content) return null;
  const parts = content.split(URL_RE);
  const invites: string[] = [];

  const nodes = parts.map((part, index) => {
    if (!URL_RE.test(part)) {
      URL_RE.lastIndex = 0;
      return <span key={index}>{part}</span>;
    }
    URL_RE.lastIndex = 0;
    const code = inviteCodeFromUrl(part);
    if (code) {
      invites.push(code);
      return (
        <span key={index} className="text-primary underline underline-offset-2">
          {part}
        </span>
      );
    }
    return (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-primary underline underline-offset-2 break-all"
      >
        {part}
      </a>
    );
  });

  return (
    <>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{nodes}</p>
      {invites.map((code) => (
        <InviteCard key={code} code={code} />
      ))}
    </>
  );
}

function InviteCard({ code }: { code: string }) {
  return (
    <div className="mt-2 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
        <Users className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Server invite
        </p>
        <p className="truncate text-sm">You've been invited to join a server</p>
      </div>
      <Link
        to="/invite/$code"
        params={{ code }}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
      >
        Join
      </Link>
    </div>
  );
}

export function AttachmentBlock({ message }: { message: Message }) {
  const [url, setUrl] = useState<string | null>(null);
  const path = message.attachment_path;
  const isImage = (message.attachment_type ?? "").startsWith("image/");

  useEffect(() => {
    let active = true;
    if (!path) return;
    attachmentUrl(path)
      .then((signed) => {
        if (active) setUrl(signed);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [path]);

  if (!path) return null;

  if (isImage) {
    return (
      <div className="mt-2 max-w-md overflow-hidden rounded-xl border border-border bg-surface">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={message.attachment_name ?? "attachment"}
              loading="lazy"
              className="max-h-80 w-full object-contain"
            />
          </a>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
        <FileIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{message.attachment_name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(message.attachment_size ?? 0)}</p>
      </div>
      {url ? (
        <a
          href={url}
          download={message.attachment_name ?? true}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-accent p-2 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          aria-label="Download file"
        >
          <Download className="h-4 w-4" />
        </a>
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
