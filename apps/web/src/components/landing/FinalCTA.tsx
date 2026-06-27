import Link from "next/link";
import { FINAL_CTA } from "./landing-data";
import { Button } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section className="px-4 py-24 md:px-6">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-clay border border-white/10 bg-surface-elevated/80 p-10 text-center backdrop-blur-xl md:p-16">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,197,94,0.12)_0%,_transparent_70%)]"
          aria-hidden
        />
        <div className="relative space-y-6">
          <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
            {FINAL_CTA.headline}
          </h2>
          <p className="mx-auto max-w-lg text-muted">{FINAL_CTA.subhead}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button href="/demo/submit">{FINAL_CTA.primaryCta}</Button>
            <Link
              href="/demo"
              className="text-sm font-semibold text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {FINAL_CTA.secondaryCta} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
