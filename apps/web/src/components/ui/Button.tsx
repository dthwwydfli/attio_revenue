import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-black hover:bg-accent/90 glow-accent focus-visible:outline-accent",
  secondary:
    "border border-white/10 bg-white/5 text-foreground hover:bg-white/10 focus-visible:outline-accent",
  ghost: "text-muted hover:text-foreground hover:bg-white/5 focus-visible:outline-accent",
};

interface BaseProps {
  variant?: Variant;
  className?: string;
}

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkButtonProps = BaseProps &
  Omit<ComponentProps<typeof Link>, "className"> & { href: string };

export function Button(props: ButtonProps | LinkButtonProps) {
  const { variant = "primary", className, ...rest } = props;
  const classes = cn(
    "inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  );

  if ("href" in rest && rest.href) {
    const { href, ...linkProps } = rest;
    return <Link href={href} className={classes} {...linkProps} />;
  }

  return <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
