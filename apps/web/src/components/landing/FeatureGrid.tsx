import { FEATURES } from "./landing-data";
import { FeatureCard } from "./FeatureCard";
import { SectionLabel } from "./SectionLabel";

export function FeatureGrid() {
  return (
    <section className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <SectionLabel>The agent loop</SectionLabel>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            Four steps. Zero manual routing.
          </h2>
          <p className="mt-3 text-muted">
            Every inbound lead runs the same autonomous loop: enrich, rank, respond, write back.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
