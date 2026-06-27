import type { SlngResult } from "@leadloop/shared";

export function isDemoSlngSession(slng: SlngResult): boolean {
  return slng.callId?.startsWith("mock-") === true;
}

export function hasLiveSlngSession(slng: SlngResult): boolean {
  return (
    slng.status !== "skipped" &&
    Boolean(slng.livekitUrl && slng.livekitToken) &&
    !isDemoSlngSession(slng)
  );
}

export function canOpenVoiceSession(slng: SlngResult): boolean {
  return slng.status !== "skipped";
}

export function voiceSessionPath(leadId: string): string {
  return `/voice/${leadId}`;
}
