import { HERO_COPY } from "./landing-data";
import { HeroPreviewCard } from "./HeroPreviewCard";
import { ReplayShortcuts } from "./ReplayShortcuts";
import { SectionLabel } from "./SectionLabel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  apiOnline?: boolean;
}

export function HeroSection({ apiOnline }: HeroSectionProps) {
  return (
    <section className="relative px-4 py-20 md:px-6 md:py-28 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-6 lg:col-span-7">
          <SectionLabel>{HERO_COPY.eyebrow}</SectionLabel>

          <div>
            <p className="font-display text-sm font-medium tracking-wide text-muted">
              {HERO_COPY.productName}
            </p>
            <h1 className="mt-2 font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              {HERO_COPY.headline}
            </h1>
          </div>

          <p className="max-w-xl text-base leading-relaxed text-muted md:text-lg">
            {HERO_COPY.subhead}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button href="/console">{HERO_COPY.primaryCta}</Button>
            <Button href="#workflow" variant="secondary">
              {HERO_COPY.secondaryCta}
            </Button>
          </div>

          {apiOnline !== undefined && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  apiOnline ? "bg-accent" : "bg-red-400",
                )}
                aria-hidden
              />
              <span>
                API {apiOnline ? "online" : "offline. Start with pnpm dev:api"}
              </span>
            </div>
          )}

          <ReplayShortcuts />
        </div>

        <div className="lg:col-span-5">
          <HeroPreviewCard />
        </div>
      </div>
    </section>
  );
}
