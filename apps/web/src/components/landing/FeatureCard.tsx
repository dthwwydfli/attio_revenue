import { ACCENT_STYLES, type FeatureItem } from "./landing-data";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  feature: FeatureItem;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const { step, title, description, accent, icon: Icon } = feature;
  const styles = ACCENT_STYLES[accent];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-surface/80 p-6 transition-all duration-300",
        styles.border,
        styles.glow,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
          styles.gradient,
        )}
        aria-hidden
      />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              styles.icon,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <span className="font-display text-2xl font-medium text-white/10">{step}</span>
        </div>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </article>
  );
}
