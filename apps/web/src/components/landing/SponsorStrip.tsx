import { SPONSORS, SponsorBadge } from "./SponsorLogo";
import { SectionLabel } from "./SectionLabel";

export function SponsorStrip() {
  // Repeat the set enough times to always overflow the viewport, then duplicate
  // that block so the -50% translate loops seamlessly with no empty gaps.
  const half = [...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS];
  const track = [...half, ...half];

  return (
    <section className="border-y border-white/5 px-4 py-16 md:px-6">
      <div className="mx-auto max-w-7xl text-center">
        <SectionLabel>Built with</SectionLabel>
        <div className="group relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="marquee-track flex w-max items-center justify-center gap-16 group-hover:[animation-play-state:paused]">
            {track.map((sponsor, index) => (
              <SponsorBadge key={`${sponsor.id}-${index}`} sponsor={sponsor} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
