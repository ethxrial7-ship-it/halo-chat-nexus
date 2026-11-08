<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Voice calls use the existing peer-to-peer WebRTC mesh; screen sharing is a renegotiated video track on those same peers to preserve call signaling and privacy.
- Server voice channels are channels with kind=voice; joining reuses CallProvider with a "voice:<channelId>" room id and skips ringing.
- Call sound overrides are account-scoped and writable only by database-validated admins; each browser reads its own override when ringing, and synthesized variants keep call audio local.
