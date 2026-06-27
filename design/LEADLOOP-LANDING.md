# LeadLoop Landing — Dark Clay Token Mapping

Adaptation of Clay DESIGN.md for LeadLoop's dark operator-console landing page.

## Surface mapping

| Clay token | Light value | LeadLoop dark |
|------------|-------------|---------------|
| canvas | #fffaf0 | #0a0a0f (background) |
| surface-dark | #0a1a1a | surface |
| surface-dark-elevated | #1a2a2a | surface-elevated |
| on-dark | #ffffff | foreground |
| on-dark-soft | #a0a0a0 | muted |
| hairline | #e5e5e5 | border (white/5 on dark) |

## Accent mapping (glow tints, not full fills)

| Clay brand | Hex | LeadLoop use |
|------------|-----|--------------|
| brand-mint | #a4d4c5 | Enrich card |
| brand-lavender | #b8a4ed | Rank card |
| brand-peach | #ffb084 | Respond card |
| brand-teal | #1a3a3a | Write back card |
| brand-pink | #ff4d8b | Hero blob glow |
| success | #22c55e | Primary CTA (accent) |

## Typography → Tailwind

| Clay scale | Tailwind class |
|------------|----------------|
| display-xl | text-5xl md:text-6xl lg:text-7xl font-display font-medium tracking-tight |
| display-lg | text-4xl md:text-5xl font-display font-medium tracking-tight |
| display-md | text-3xl md:text-4xl font-display font-medium |
| title-md | text-lg font-semibold |
| body-md | text-base text-muted leading-relaxed |
| caption-uppercase | text-xs font-semibold uppercase tracking-widest |

## Fonts

- Display: Syne (Plain Black substitute)
- Body: Inter

## Spacing

- Section padding: py-24 (96px)
- Card radius: rounded-2xl (24px / Clay xl)
- Button height: h-11 (44px)
