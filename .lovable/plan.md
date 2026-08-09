# Halo's Messages — attachments, invite links, mobile layout

## 1. File sending (up to 100 MB)

- Create a private storage bucket `attachments` with a 100 MB per-file limit, plus access rules so only members of the channel/conversation the file belongs to can read it, and only the uploader can write it (files stored under `<user id>/<message id>/<filename>`).
- Add attachment fields to messages: file path, file name, size and content type (a message can be text, a file, or both).
- Composer gets a paperclip button and drag-and-drop:
  - picks a file, shows name/size and an upload progress state
  - rejects anything over 100 MB with a clear toast
  - uploads first, then creates the message row referencing the file
- Message rendering:
  - images render as an inline preview (max height, click to open full size)
  - other files render as a download card with icon, name, size and a download button
  - links are generated as short-lived signed URLs so private files stay private

## 2. Server invites as clickable links

- Sidebar shows a full invite link (`https://<site>/invite/<code>`) with a copy button instead of the bare code.
- New public route `/invite/$code`:
  - signed in → joins the server automatically and redirects into its first channel
  - not signed in → sends the user to sign in/up, then completes the join and redirects
  - invalid/expired code → friendly error page with a link back to the app
- Messages containing URLs become clickable. Invite links to this site are rendered as an invite card ("Join <server name>") with a Join button; other URLs render as plain links (opened in a new tab, safely).

## 3. Mobile layout (single-pane navigation)

Below the tablet breakpoint the three-column desktop layout becomes one screen at a time:

```text
DMs:      [ conversation list ]  --tap-->  [ chat ]  --back-->  [ list ]
Servers:  [ server + channel list ] --tap--> [ chat ] --back--> [ channels ]
```

- On phones the sidebar (DM list / channel list) is the full screen when no chat is open; opening a chat replaces it full-screen.
- The chat header gets a back arrow on mobile that returns to the list; server chats return to the channel list, DM chats to the conversation list.
- The server rail becomes a horizontal strip at the top of the list view (or a slide-in drawer) so servers are still switchable on phone.
- Member list stays hidden on phone, reachable from a header button as a slide-over sheet.
- Composer, safe-area padding and tap targets sized for touch; desktop layout unchanged.

## Technical notes

- Migration: `messages` gains `attachment_path`, `attachment_name`, `attachment_size`, `attachment_type`; storage bucket created via the storage tool with `file_size_limit = 104857600`; RLS policies on `storage.objects` reuse the existing `is_server_member` / `is_conversation_member` helpers via a message lookup.
- Invite joining reuses the existing `join_server_by_invite` RPC; the `/invite/$code` route stores the pending code and replays it after auth.
- Mobile behaviour is driven by the existing `useIsMobile` hook plus Tailwind breakpoints inside `AppShell`, `ChatView` and the sidebars — routing is unchanged, only presentation.
- Very large uploads use resumable/chunked upload so 100 MB files do not time out.
