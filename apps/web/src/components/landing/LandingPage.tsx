import { GlowBackground } from "./GlowBackground";
import { HeroSection } from "./HeroSection";
import { FeatureGrid } from "./FeatureGrid";
import { WorkflowPipeline } from "./WorkflowPipeline";
import { SponsorStrip } from "./SponsorStrip";
import { FinalCTA } from "./FinalCTA";

interface LandingPageProps {
  apiOnline?: boolean;
}

export function LandingPage({ apiOnline }: LandingPageProps) {
  return (
    <>
      <GlowBackground />
      <main>
        <HeroSection apiOnline={apiOnline} />
        <FeatureGrid />
        <WorkflowPipeline />
        <SponsorStrip />
        <FinalCTA />
      </main>
    </>
  );
}
