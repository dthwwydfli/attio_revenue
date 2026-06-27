"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { LeadRun } from "@leadloop/shared";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";

export type BrowserVoiceSessionHandle = {
  start: () => Promise<void>;
  disconnect: () => void;
};

type BrowserVoiceState = "idle" | "connecting" | "connected" | "error";

interface BrowserVoiceStart {
  mode: "browser";
  greeting: string;
  fallbackReason?: string;
}

interface BrowserVoiceMessage {
  reply: string;
}

interface BrowserVoiceTts {
  audioBase64: string;
  mimeType: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface BrowserVoiceSessionProps {
  run: LeadRun;
  onDisconnect: () => void;
  onStateChange?: (state: BrowserVoiceState) => void;
  hideStartButton?: boolean;
}

export const BrowserVoiceSession = forwardRef<BrowserVoiceSessionHandle, BrowserVoiceSessionProps>(
  function BrowserVoiceSession(
    { run, onDisconnect, onStateChange, hideStartButton = false },
    ref,
  ) {
    const [state, setState] = useState<BrowserVoiceState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const [agentSpeaking, setAgentSpeaking] = useState(false);
    const [userSpeaking, setUserSpeaking] = useState(false);
    const [fallbackReason, setFallbackReason] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const listeningRef = useRef(false);
    const mutedRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const setVoiceState = useCallback(
      (next: BrowserVoiceState) => {
        setState(next);
        onStateChange?.(next);
      },
      [onStateChange],
    );

    const speakWithSynthesis = useCallback((text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        setAgentSpeaking(true);
        utterance.onend = () => {
          setAgentSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setAgentSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      });
    }, []);

    const speak = useCallback(
      async (text: string): Promise<void> => {
        setAgentSpeaking(true);
        try {
          const tts = await apiFetch<BrowserVoiceTts>(`/leads/${run.id}/voice-browser/tts`, {
            method: "POST",
            body: JSON.stringify({ text }),
          });
          if (audioRef.current) {
            audioRef.current.pause();
          }
          const audio = new Audio(`data:${tts.mimeType};base64,${tts.audioBase64}`);
          audioRef.current = audio;
          await audio.play();
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
          });
        } catch {
          await speakWithSynthesis(text);
        } finally {
          setAgentSpeaking(false);
        }
      },
      [run.id, speakWithSynthesis],
    );

    const stopRecognition = useCallback(() => {
      listeningRef.current = false;
      recognitionRef.current?.stop();
    }, []);

    const sendUserMessage = useCallback(
      async (message: string) => {
        const result = await apiFetch<BrowserVoiceMessage>(
          `/leads/${run.id}/voice-browser/message`,
          {
            method: "POST",
            body: JSON.stringify({ message }),
          },
        );
        await speak(result.reply);
      },
      [run.id, speak],
    );

    const startListening = useCallback(() => {
      if (typeof window === "undefined") return;
      const SpeechRecognitionCtor =
        window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor || mutedRef.current || !listeningRef.current) return;

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        if (!last) return;
        setUserSpeaking(!last.isFinal);
        if (last.isFinal && !mutedRef.current) {
          const transcript = last[0]?.transcript?.trim();
          if (transcript) {
            stopRecognition();
            void sendUserMessage(transcript).finally(() => {
              if (listeningRef.current && !mutedRef.current) startListening();
            });
          }
        }
      };

      recognition.onerror = () => {
        if (listeningRef.current && !mutedRef.current) {
          setTimeout(() => startListening(), 500);
        }
      };

      recognition.onend = () => {
        if (listeningRef.current && !mutedRef.current && recognitionRef.current === recognition) {
          setTimeout(() => startListening(), 300);
        }
      };

      try {
        recognition.start();
      } catch {
        // already started
      }
    }, [sendUserMessage, stopRecognition]);

    const disconnect = useCallback(() => {
      listeningRef.current = false;
      stopRecognition();
      audioRef.current?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      setAgentSpeaking(false);
      setUserSpeaking(false);
      setMuted(false);
      mutedRef.current = false;
      setVoiceState("idle");
      onDisconnect();
    }, [onDisconnect, setVoiceState, stopRecognition]);

    const connect = useCallback(async () => {
      setError(null);
      setVoiceState("connecting");
      try {
        const start = await apiFetch<BrowserVoiceStart>(`/leads/${run.id}/voice-browser/start`, {
          method: "POST",
        });
        setFallbackReason(start.fallbackReason ?? null);
        await speak(start.greeting);
        listeningRef.current = true;
        mutedRef.current = false;
        setMuted(false);
        setVoiceState("connected");
        startListening();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start browser voice");
        setVoiceState("error");
      }
    }, [run.id, setVoiceState, speak, startListening]);

    useImperativeHandle(ref, () => ({ start: connect, disconnect }), [connect, disconnect]);

    useEffect(() => {
      return () => {
        listeningRef.current = false;
        stopRecognition();
        audioRef.current?.pause();
        if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      };
    }, [stopRecognition]);

    const toggleMute = useCallback(() => {
      const next = !mutedRef.current;
      mutedRef.current = next;
      setMuted(next);
      if (next) {
        stopRecognition();
        setUserSpeaking(false);
      } else if (state === "connected") {
        listeningRef.current = true;
        startListening();
      }
    }, [startListening, state, stopRecognition]);

    return (
      <div className="space-y-4">
        <audio ref={audioRef} className="sr-only" aria-hidden />

        <div className="rounded-lg border border-blue-400/30 bg-blue-400/5 p-4 text-center text-sm">
          <p className="font-medium text-blue-300">Browser voice mode</p>
          <p className="mt-1 text-muted">
            {fallbackReason ??
              "Two-way voice via your browser mic and SLNG TTS. Allow microphone when prompted."}
          </p>
        </div>

        <div className="min-h-[72px] rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted">
            {state === "connected" && agentSpeaking ? (
              <>
                <Volume2 className="h-4 w-4 text-accent motion-safe:animate-pulse" aria-hidden />
                <span className="text-accent">Agent speaking…</span>
              </>
            ) : state === "connected" && userSpeaking && !muted ? (
              <span className="text-foreground">Listening to you…</span>
            ) : state === "connected" ? (
              <span>Speak after the agent finishes — two-way voice is active</span>
            ) : (
              <span>Start to hear the agent greeting and respond by voice</span>
            )}
          </div>
        </div>

        {error && (
          <p className="text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {!hideStartButton && (state === "idle" || state === "error") && (
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={() => void connect()} className="min-h-[44px] gap-2">
              Start browser voice
            </Button>
          </div>
        )}

        {state === "connecting" && (
          <div className="flex justify-center">
            <Button disabled className="min-h-[44px]">
              Starting…
            </Button>
          </div>
        )}

        {state === "connected" && (
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={toggleMute}
              aria-pressed={muted}
              className="min-h-[44px] gap-2"
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={disconnect}
              className="min-h-[44px] gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        )}
      </div>
    );
  },
);
