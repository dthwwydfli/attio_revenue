"use client";

import type { DemoScenario } from "@leadloop/shared";
import { Button } from "@/components/ui/Button";
import { Flame, Snowflake, Sun } from "lucide-react";

const SCENARIOS: {
  scenario: DemoScenario;
  title: string;
  icon: typeof Flame;
}[] = [
  { scenario: "hot", title: "Hot", icon: Flame },
  { scenario: "warm", title: "Warm", icon: Sun },
  { scenario: "cold", title: "Cold", icon: Snowflake },
];

interface DemoControlsProps {
  onReplay: (scenario: DemoScenario) => void;
  isReplaying: boolean;
  error?: string | null;
}

export function DemoControls({ onReplay, isReplaying, error }: DemoControlsProps) {
  return (
    <div className="mt-auto space-y-3 border-t border-white/5 pt-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
        Replay demo
      </p>
      <div className="grid gap-1.5">
        {SCENARIOS.map(({ scenario, title, icon: Icon }) => (
          <Button
            key={scenario}
            variant="secondary"
            disabled={isReplaying}
            onClick={() => onReplay(scenario)}
            className="h-auto min-h-[40px] w-full justify-start gap-2 px-3 py-2 text-left"
            aria-label={`Replay ${title} lead scenario`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            <span className="text-sm">{title}</span>
          </Button>
        ))}
      </div>
      {isReplaying && (
        <p className="text-xs text-accent motion-safe:animate-pulse">Running pipeline…</p>
      )}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
