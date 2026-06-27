interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-accent">{children}</p>
  );
}
