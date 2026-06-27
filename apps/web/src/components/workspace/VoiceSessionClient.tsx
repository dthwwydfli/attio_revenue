"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeadRun, SlngResult } from "@leadloop/shared";
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrowserVoiceSession, type BrowserVoiceSessionHandle } from "@/components/workspace/BrowserVoiceSession";
import { canStartLiveVoice, isDemoSlngSession } from "@/lib/slng-utils";
import { apiFetch } from "@/lib/api-client";
import Link from "next/link";

type SessionState = "idle" | "connecting" | "connected" | "error";
type VoiceMode = "livekit" | "browser" | null;

function isCreditError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("402") || lower.includes("insufficient credit") || lower.includes("top up");
}

interface VoiceSessionClientProps {
  run: LeadRun;
}

const AUDIO_SINK_ID = "leadloop-voice-audio-sink";

function getOrCreateAudioSink(): HTMLDivElement {
  let sink = document.getElementById(AUDIO_SINK_ID) as HTMLDivElement | null;
  if (!sink) {
    sink = document.createElement("div");
    sink.id = AUDIO_SINK_ID;
    sink.setAttribute("aria-hidden", "true");
    sink.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none";
    document.body.appendChild(sink);
  }
  return sink;
}

async function ensureAudioPlayback(room: Room, element: HTMLAudioElement): Promise<void> {
  try {
    await room.startAudio();
  } catch {
    // Browser may require another gesture — surfaced via AudioPlaybackStatusChanged
  }
  try {
    await element.play();
  } catch {
    // Retry after startAudio unlocks output
  }
}

function attachRemoteAudio(
  track: RemoteTrack,
  sink: HTMLDivElement,
  room: Room,
): HTMLAudioElement | null {
  if (track.kind !== Track.Kind.Audio) return null;

  const trackId = track.sid;
  const existing = sink.querySelector<HTMLAudioElement>(`audio[data-track-sid="${trackId}"]`);
  if (existing) {
    void ensureAudioPlayback(room, existing);
    return existing;
  }

  const element = track.attach() as HTMLAudioElement;
  element.dataset.trackSid = trackId;
  element.autoplay = true;
  element.setAttribute("playsinline", "true");
  element.volume = 1;
  // Never use display:none — Chrome blocks audio output on hidden media elements
  element.style.cssText =
    "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
  sink.appendChild(element);
  void ensureAudioPlayback(room, element);
  return element;
}

function wireRemoteAudio(room: Room, sink: HTMLDivElement): () => void {
  const subscribePublication = (
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (participant.isLocal || publication.kind !== Track.Kind.Audio) return;
    if (!publication.isSubscribed) {
      publication.setSubscribed(true);
    }
    if (publication.track) {
      attachRemoteAudio(publication.track, sink, room);
    }
  };

  const handleParticipant = (participant: RemoteParticipant) => {
    for (const publication of participant.trackPublications.values()) {
      subscribePublication(publication, participant);
    }
  };

  const onTrackSubscribed = (
    track: RemoteTrack,
    _pub: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (!participant.isLocal) {
      attachRemoteAudio(track, sink, room);
      void room.startAudio().catch(() => undefined);
    }
  };

  const onTrackPublished = (
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    subscribePublication(publication, participant);
  };

  room.remoteParticipants.forEach(handleParticipant);
  room.on(RoomEvent.ParticipantConnected, handleParticipant);
  room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
  room.on(RoomEvent.TrackPublished, onTrackPublished);

  return () => {
    room.off(RoomEvent.ParticipantConnected, handleParticipant);
    room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.off(RoomEvent.TrackPublished, onTrackPublished);
  };
}

export function VoiceSessionClient({ run }: VoiceSessionClientProps) {
  const slng = run.slng;
  const [state, setState] = useState<SessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [agentJoined, setAgentJoined] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(null);
  const browserRef = useRef<BrowserVoiceSessionHandle>(null);
  const roomRef = useRef<Room | null>(null);
  const unwiredRef = useRef<(() => void) | null>(null);
  const rescanTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const isDemo = !slng || isDemoSlngSession(slng);
  const canConnect = slng && canStartLiveVoice(slng, run.score?.band);

  const startBrowserVoice = useCallback(async () => {
    setVoiceMode("browser");
    setError(null);
    await browserRef.current?.start();
  }, []);

  const clearAudioSink = useCallback(() => {
    const sink = document.getElementById(AUDIO_SINK_ID);
    if (sink) sink.innerHTML = "";
  }, []);

  const clearRescanTimers = useCallback(() => {
    for (const timer of rescanTimersRef.current) {
      clearTimeout(timer);
    }
    rescanTimersRef.current = [];
  }, []);

  const scheduleAgentRescan = useCallback((room: Room, sink: HTMLDivElement) => {
    clearRescanTimers();
    const delays = [250, 750, 2000, 5000];
    for (const delay of delays) {
      const timer = setTimeout(() => {
        if (room.state !== ConnectionState.Connected) return;
        if (room.remoteParticipants.size > 0) {
          setAgentJoined(true);
        }
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            if (publication.kind !== Track.Kind.Audio || participant.isLocal) continue;
            if (!publication.isSubscribed) publication.setSubscribed(true);
            if (publication.track) attachRemoteAudio(publication.track, sink, room);
          }
        }
        void room.startAudio().catch(() => undefined);
      }, delay);
      rescanTimersRef.current.push(timer);
    }
  }, [clearRescanTimers]);

  const unlockAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
      const sink = getOrCreateAudioSink();
      for (const el of sink.querySelectorAll("audio")) {
        await el.play().catch(() => undefined);
      }
    } catch {
      setAudioBlocked(true);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setState("idle");
    setAgentSpeaking(false);
    setUserSpeaking(false);
    setAgentJoined(false);
    setAudioBlocked(false);
    setMuted(false);
    setError(null);

    clearRescanTimers();
    unwiredRef.current?.();
    unwiredRef.current = null;

    const room = roomRef.current;
    roomRef.current = null;

    clearAudioSink();

    if (!room) return;

    room.removeAllListeners();

    try {
      await room.localParticipant.setMicrophoneEnabled(false);
    } catch {
      // ignore
    }

    try {
      await room.disconnect();
    } catch {
      // ignore
    }
  }, [clearAudioSink, clearRescanTimers]);

  const connect = useCallback(async () => {
    setError(null);
    setState("connecting");
    setAgentJoined(false);
    setAudioBlocked(false);

    try {
      const fresh = await apiFetch<SlngResult>(`/leads/${run.id}/voice-session`, {
        method: "POST",
      });

      if (!fresh.livekitUrl || !fresh.livekitToken) {
        throw new Error("Could not start voice session — check SLNG keys and agent ID");
      }

      const sink = getOrCreateAudioSink();
      clearAudioSink();

      const room = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      roomRef.current = room;
      unwiredRef.current = wireRemoteAudio(room, sink);

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const localIdentity = room.localParticipant.identity;
        setAgentSpeaking(speakers.some((p) => p.identity !== localIdentity));
        setUserSpeaking(speakers.some((p) => p.identity === localIdentity));
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        if (!participant.isLocal) setAgentJoined(true);
      });

      room.on(RoomEvent.LocalTrackPublished, () => {
        setMuted(!room.localParticipant.isMicrophoneEnabled);
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setAudioBlocked(!room.canPlaybackAudio);
      });

      room.on(RoomEvent.Disconnected, () => {
        setAgentSpeaking(false);
        setUserSpeaking(false);
        setAgentJoined(false);
        setMuted(false);
        setState("idle");
      });

      await room.connect(fresh.livekitUrl, fresh.livekitToken, { autoSubscribe: true });
      await room.startAudio();
      await room.localParticipant.setMicrophoneEnabled(true);

      setAudioBlocked(!room.canPlaybackAudio);
      if (room.remoteParticipants.size > 0) setAgentJoined(true);

      scheduleAgentRescan(room, sink);

      setMuted(false);
      setState("connected");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to connect to voice session";
      if (isCreditError(raw)) {
        setState("idle");
        setError(null);
        try {
          await startBrowserVoice();
        } catch (browserErr) {
          setError(
            browserErr instanceof Error ? browserErr.message : "Browser voice failed to start",
          );
          setState("error");
        }
        return;
      }
      const message = raw.replace(/^API \/leads\/[^ ]+ failed: 502 /, "");
      setError(message);
      setState("error");
      await disconnect();
    }
  }, [clearAudioSink, disconnect, run.id, scheduleAgentRescan, startBrowserVoice]);

  useEffect(() => {
    return () => {
      void disconnect();
      const sink = document.getElementById(AUDIO_SINK_ID);
      sink?.remove();
    };
  }, [disconnect]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;

    try {
      const enableMic = !room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(enableMic);
      setMuted(!enableMic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle microphone");
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    void disconnect();
  }, [disconnect]);

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

      {isDemo && slng?.status !== "failed" && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-center text-sm">
          <p className="font-medium text-amber-400">Demo mode</p>
          <p className="mt-1 text-muted">
            Replay a hot lead with SLNG configured in <code className="text-xs">.env.local</code>{" "}
            for a live browser voice session.
          </p>
        </div>
      )}

      {slng?.status === "failed" && slng.transcriptSnippet && voiceMode !== "browser" && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-center text-sm">
          <p className="font-medium text-amber-400">SLNG session unavailable</p>
          <p className="mt-1 text-muted">{slng.transcriptSnippet}</p>
          <p className="mt-2 text-xs text-muted">Click Start voice — we will try SLNG LiveKit, then browser voice.</p>
        </div>
      )}

      {canConnect && (
        <>
          <div className={voiceMode === "browser" ? "block" : "hidden"}>
            <BrowserVoiceSession
              ref={browserRef}
              run={run}
              hideStartButton
              onDisconnect={() => {
                setVoiceMode(null);
                setState("idle");
              }}
            />
          </div>

          {voiceMode !== "browser" && (
        <div className="space-y-4">
          <div
            id="agent-audio-status"
            className="min-h-[72px] rounded-lg border border-white/5 bg-white/[0.02] p-4"
          >
            <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted">
              {state === "connected" && agentSpeaking ? (
                <>
                  <Volume2 className="h-4 w-4 text-accent motion-safe:animate-pulse" aria-hidden />
                  <span className="text-accent">Agent speaking…</span>
                </>
              ) : state === "connected" && userSpeaking && !muted ? (
                <span className="text-foreground">Listening to you…</span>
              ) : state === "connected" && !agentJoined ? (
                <span>Connected — waiting for agent to join…</span>
              ) : state === "connected" ? (
                <span>Connected — speak after the greeting; the agent will respond</span>
              ) : (
                <span>Connect to start a live conversation with the SLNG agent</span>
              )}
            </div>
          </div>

          {audioBlocked && state === "connected" && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-center">
              <p className="text-sm text-amber-400">Browser blocked agent audio</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 min-h-[44px]"
                onClick={() => void unlockAudio()}
              >
                Enable audio
              </Button>
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          {(error || slng?.status === "failed") && state === "idle" && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px]"
                onClick={() => void startBrowserVoice()}
              >
                Use browser voice instead
              </Button>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {state === "idle" || state === "error" ? (
              <Button type="button" onClick={() => void connect()} className="min-h-[44px] gap-2">
                <Phone className="h-4 w-4" aria-hidden />
                Start voice conversation
              </Button>
            ) : state === "connecting" ? (
              <Button disabled className="min-h-[44px]">
                Starting session…
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void toggleMute()}
                  aria-pressed={muted}
                  aria-label={muted ? "Unmute microphone" : "Mute microphone"}
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
                  type="button"
                  variant="secondary"
                  onClick={handleDisconnect}
                  aria-label="Disconnect voice session"
                  className="min-h-[44px] gap-2"
                >
                  <PhoneOff className="h-4 w-4" aria-hidden />
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {state === "connected" && (
            <p className="text-center text-xs text-muted">
              {muted
                ? "Microphone muted — click Unmute to speak again."
                : "Two-way voice is active. Allow microphone access and wait for the agent greeting."}
            </p>
          )}
        </div>
          )}
        </>
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
