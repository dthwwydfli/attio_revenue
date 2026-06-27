export function GlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute -left-32 top-0 h-[500px] w-[500px] blob bg-accent-pink/10 blur-3xl motion-safe:animate-glow-pulse" />
      <div className="absolute -right-24 top-1/4 h-[400px] w-[400px] blob bg-accent-lavender/8 blur-3xl motion-safe:animate-glow-pulse [animation-delay:1s]" />
      <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] blob bg-accent-teal/15 blur-3xl motion-safe:animate-glow-pulse [animation-delay:2s]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.06)_0%,_transparent_50%)]" />
    </div>
  );
}
