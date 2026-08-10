import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { notifyMembers } from "@/lib/notify.functions";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

type IncomingCall = { conversationId: string; title: string; fromName: string };
type ActiveCall = { conversationId: string; title: string };

type CallContextValue = {
  active: ActiveCall | null;
  startCall: (conversationId: string, title: string, memberIds: string[]) => Promise<void>;
  inCall: (conversationId: string) => boolean;
};

const CallContext = createContext<CallContextValue>({
  active: null,
  startCall: async () => {},
  inCall: () => false,
});

export function useCall() {
  return useContext(CallContext);
}

/** Simple two-tone ringtone using the Web Audio API. */
function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) return;
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      const beep = () => {
        [0, 0.4].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.35);
        });
      };
      beep();
      timerRef.current = setInterval(beep, 2500);
    } catch {
      /* audio is best effort */
    }
  }, []);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const myId = session?.user.id;
  const navigate = useNavigate();
  const ringtone = useRingtone();

  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pcsRef = useRef(new Map<string, RTCPeerConnection>());
  const audioRef = useRef<HTMLDivElement>(null);

  // Ring listener — always on while signed in.
  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`ring:${myId}`)
      .on("broadcast", { event: "ring" }, ({ payload }) => {
        const call = payload as IncomingCall & { conversationId: string };
        setIncoming(call);
      })
      .on("broadcast", { event: "ring-cancel" }, () => setIncoming(null))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId]);

  useEffect(() => {
    if (incoming && !active) ringtone.start();
    else ringtone.stop();
  }, [incoming, active, ringtone]);

  const attachAudio = useCallback((peerId: string, stream: MediaStream) => {
    const container = audioRef.current;
    if (!container) return;
    let el = container.querySelector<HTMLAudioElement>(`audio[data-peer="${peerId}"]`);
    if (!el) {
      el = document.createElement("audio");
      el.dataset["peer"] = peerId;
      el.autoplay = true;
      container.appendChild(el);
    }
    el.srcObject = stream;
    void el.play().catch(() => {});
  }, []);

  const teardown = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    if (audioRef.current) audioRef.current.innerHTML = "";
    setPeers([]);
    setMuted(false);
    setActive(null);
  }, []);

  const signal = useCallback((to: string, kind: string, data: unknown) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: { from: myId, to, kind, data },
    });
  }, [myId]);

  const ensurePeer = useCallback(
    (peerId: string, initiator: boolean) => {
      if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)!;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcsRef.current.set(peerId, pc);
      streamRef.current?.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
      pc.onicecandidate = (event) => {
        if (event.candidate) signal(peerId, "ice", event.candidate.toJSON());
      };
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) attachAudio(peerId, stream);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          pc.close();
          pcsRef.current.delete(peerId);
          setPeers((prev) => prev.filter((p) => p !== peerId));
        }
      };
      if (initiator) {
        void (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signal(peerId, "offer", offer);
        })();
      }
      setPeers((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
      return pc;
    },
    [attachAudio, signal],
  );

  const connect = useCallback(
    async (conversationId: string, title: string) => {
      if (!myId) return;
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast.error("Microphone access is required for voice calls");
        return;
      }
      setActive({ conversationId, title });

      const channel = supabase.channel(`call:${conversationId}`, {
        config: { presence: { key: myId }, broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "signal" }, async ({ payload }) => {
          const message = payload as { from: string; to: string; kind: string; data: unknown };
          if (message.to !== myId || message.from === myId) return;
          const pc = ensurePeer(message.from, false);
          if (message.kind === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data as RTCSessionDescriptionInit));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            signal(message.from, "answer", answer);
          } else if (message.kind === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data as RTCSessionDescriptionInit));
          } else if (message.kind === "ice") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(message.data as RTCIceCandidateInit));
            } catch {
              /* ignore late candidates */
            }
          }
        })
        .on("presence", { event: "sync" }, () => {
          const keys = Object.keys(channel.presenceState());
          keys.filter((key) => key !== myId).forEach((key) => ensurePeer(key, myId < key));
          setPeers((prev) => prev.filter((p) => keys.includes(p)));
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          const pc = pcsRef.current.get(key);
          pc?.close();
          pcsRef.current.delete(key);
          setPeers((prev) => prev.filter((p) => p !== key));
          audioRef.current?.querySelector(`audio[data-peer="${key}"]`)?.remove();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await channel.track({ userId: myId });
        });
    },
    [ensurePeer, myId, signal],
  );

  const startCall = useCallback(
    async (conversationId: string, title: string, memberIds: string[]) => {
      if (active?.conversationId === conversationId) return;
      if (active) teardown();
      await connect(conversationId, title);
      const others = memberIds.filter((id) => id !== myId);
      const name = session?.user.email?.split("@")[0] ?? "Someone";
      await Promise.all(
        others.map(
          (id) =>
            new Promise<void>((resolve) => {
              const ring = supabase.channel(`ring:${id}`);
              ring.subscribe(async (status) => {
                if (status !== "SUBSCRIBED") return;
                await ring.send({
                  type: "broadcast",
                  event: "ring",
                  payload: { conversationId, title, fromName: name },
                });
                setTimeout(() => {
                  void supabase.removeChannel(ring);
                  resolve();
                }, 300);
              });
            }),
        ),
      );
      try {
        await notifyMembers({
          data: {
            kind: "conversation",
            targetId: conversationId,
            title: `Incoming call — ${title}`,
            body: `${name} is calling you`,
            url: `/channels/me/${conversationId}`,
            tag: `call-${conversationId}`,
            event: "call",
          },
        });
      } catch {
        /* notifications are best effort */
      }
    },
    [active, connect, myId, session?.user.email, teardown],
  );

  const hangUp = useCallback(() => {
    const conversationId = active?.conversationId;
    teardown();
    if (conversationId) toast("Call ended");
  }, [active, teardown]);

  const accept = useCallback(async () => {
    if (!incoming) return;
    const call = incoming;
    setIncoming(null);
    await connect(call.conversationId, call.title);
    void navigate({ to: "/channels/me/$conversationId", params: { conversationId: call.conversationId } });
  }, [connect, incoming, navigate]);

  const toggleMute = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    const next = !muted;
    tracks.forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  useEffect(() => teardown, [teardown]);

  const value = useMemo<CallContextValue>(
    () => ({
      active,
      startCall,
      inCall: (conversationId: string) => active?.conversationId === conversationId,
    }),
    [active, startCall],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <div ref={audioRef} className="hidden" aria-hidden />

      {incoming && !active ? (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(24rem,calc(100%-1.5rem))] rounded-2xl border border-border bg-surface p-4 shadow-halo animate-rise">
          <p className="text-sm text-muted-foreground">Incoming voice call</p>
          <p className="font-display text-lg">{incoming.title}</p>
          <p className="text-xs text-muted-foreground">from {incoming.fromName}</p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => void accept()}>
              <Phone className="mr-2 h-4 w-4" /> Accept
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setIncoming(null)}>
              <PhoneOff className="mr-2 h-4 w-4" /> Decline
            </Button>
          </div>
        </div>
      ) : null}

      {active ? (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-halo">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{active.title}</p>
            <p className="text-xs text-muted-foreground">
              {peers.length === 0 ? "Ringing…" : `${peers.length + 1} on the call`}
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button variant="destructive" size="icon" aria-label="Leave call" onClick={hangUp}>
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </CallContext.Provider>
  );
}
