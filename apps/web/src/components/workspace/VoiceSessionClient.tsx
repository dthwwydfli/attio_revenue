"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeadRun } from "@leadloop/shared";
import { Room, RoomEvent, Track, createLocalAudioTrack, type LocalAudioTrack } from "livekit-client";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { hasLiveSlngSession, isDemoSlngSession } from "@/lib/slng-utils";
import Link from "next/link";

type SessionState = "idle" | "connecting" | "connected" | "error" | "demo";

interface VoiceSessionClientProps {
  run: LeadRun;
}

export function VoiceSessionClient({ run }: VoiceSessionClientProps) {
  const slng = run.slng;
  const [state, setState] = useState<SessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const micRef = useRef<LocalAudioTrack | null>(null);
  const agentAudioRef = useRef<HTMLDivElement>(null);

  const isDemo = !slng || isDemoSlngSession(slng);
  const canConnect = slng && hasLiveSlngSession(slng);

  const disconnect = useCallback(async () => {
    micRef.current?.stop();
    micRef.current = null;
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (agentAudioRef.current) {
      agentAudioRef.current.innerHTML = "";
    }
    setState("idle");
  }, []);

  const connect = useCallback(async () => {
    if (!slng?.livekitUrl || !slng.livekitToken) return;

    setError(null);
    setState("connecting");

    try {
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio && agentAudioRef.current) {
          const element = track.attach();
          element.setAttribute("data-slng-agent", "true");
          agentAudioRef.current.appendChild(element);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setState("idle");
      });

      await room.connect(slng.livekitUrl, slng.livekitToken);
      const micTrack = await createLocalAudioTrack();
      micRef.current = micTrack;
      await room.localParticipant.publishTrack(micTrack);
      setState("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to voice session");
      setState("error");
      await disconnect();
    }
  }, [disconnect, slng]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const toggleMute = useCallback(async () => {
    const mic = micRef.current;
    if (!mic) return;
    if (muted) {
      await mic.unmute();
    } else {
      await mic.mute();
    }
    setMuted(!muted);
  }, [muted]);

  if (!slng || slng.status === "skipped") {
    return (
      <div className="glass-panel rounded-xl p-6 text-center">
        <p className="text-sm text-muted">No voice session for this lead.</p>
        <Button href={`/console?leadId=${run.id}`} variant="secondary" className="mt-4">
          Back to console
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-panel space-y-6 rounded-xl p-6 md:p-8">
      <header className="space-y-2 border-b border-white/5 pb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Phone className="h-6 w-6 text-accent" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">SLNG Voice Session</h1>
        <p className="text-sm text-muted">
          {run.input.name} · {run.input.company}
        </p>
      </header>

      {slng.transcriptSnippet && (
        <p className="text-center text-sm leading-relaxed text-muted">{slng.transcriptSnippet}</p>
      )}

      {isDemo && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-center text-sm">
          <p className="font-medium text-amber-400">Demo mode</p>
          <p className="mt-1 text-muted">
            Add real <code className="text-xs">SLNG_API_KEY</code> and{" "}
            <code className="text-xs">SLNG_AGENT_ID</code> to{" "}
            <code className="text-xs">.env.local</code>, restart the API, and replay a hot lead
            for a live browser voice session.
          </p>
        </div>
      )}

      {canConnect && (
        <div className="space-y-4">
          <div
            ref={agentAudioRef}
            id="agent-audio"
            className="min-h-[48px] rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-muted"
          >
            {state === "connected" ? "Agent audio will play here" : "Connect to start talking"}
          </div>

          {error && (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {state === "idle" || state === "error" ? (
              <Button onClick={() => void connect()} className="min-h-[44px] gap-2">
                <Phone className="h-4 w-4" aria-hidden />
                Connect to agent
              </Button>
            ) : state === "connecting" ? (
              <Button disabled className="min-h-[44px]">
                Connecting…
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => void toggleMute()}
                  className="min-h-[44px] gap-2"
                >
                  {muted ? (
                    <MicOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Mic className="h-4 w-4" aria-hidden />
                  )}
                  {muted ? "Unmute" : "Mute"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void disconnect()}
                  className="min-h-[44px] gap-2"
                >
                  <PhoneOff className="h-4 w-4" aria-hidden />
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {state === "connected" && (
            <p className="text-center text-xs text-accent motion-safe:animate-pulse">
              Live: speak with the SLNG agent
            </p>
          )}
        </div>
      )}

      <div className="flex justify-center border-t border-white/5 pt-4">
        <Link
          href={`/console?leadId=${run.id}`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to console
        </Link>
      </div>
    </div>
  );
}
