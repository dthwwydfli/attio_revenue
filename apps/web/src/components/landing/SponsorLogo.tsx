import Image from "next/image";
import { siN8n } from "simple-icons/icons";
import { cn } from "@/lib/utils";

interface SponsorBase {
  id: string;
  name: string;
  href: string;
}

interface SponsorWithAsset extends SponsorBase {
  asset: string;
  width: number;
  height: number;
  displayHeight?: string;
}

export type Sponsor = SponsorBase | SponsorWithAsset;

export const SPONSORS: Sponsor[] = [
  {
    id: "attio",
    name: "Attio",
    href: "https://attio.com",
    asset: "/logos/attio.svg",
    width: 120,
    height: 30,
    displayHeight: "h-[30px]",
  },
  { id: "n8n", name: "n8n", href: "https://n8n.io" },
  {
    id: "superlinked",
    name: "Superlinked",
    href: "https://superlinked.com",
    asset: "/logos/superlinked.svg",
    width: 160,
    height: 37,
    displayHeight: "h-[30px]",
  },
  {
    id: "slng",
    name: "SLNG",
    href: "https://slng.ai",
    asset: "/logos/slng.png",
    width: 38,
    height: 38,
    displayHeight: "h-[34px]",
  },
  {
    id: "aikido",
    name: "Aikido",
    href: "https://www.aikido.dev",
    asset: "/logos/aikido.svg",
    width: 80,
    height: 18,
    displayHeight: "h-[26px]",
  },
];

function hasAsset(sponsor: Sponsor): sponsor is SponsorWithAsset {
  return "asset" in sponsor;
}

function N8nLogo({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      aria-label="n8n"
      className={cn("h-[30px] w-auto", className)}
      fill="#EA4B71"
    >
      <title>n8n</title>
      <path d={siN8n.path} />
    </svg>
  );
}

function SponsorLogoMark({ sponsor }: { sponsor: Sponsor }) {
  if (sponsor.id === "n8n") {
    return <N8nLogo />;
  }

  if (!hasAsset(sponsor)) {
    return null;
  }

  return (
    <Image
      src={sponsor.asset}
      alt=""
      width={sponsor.width}
      height={sponsor.height}
      className={cn(
        "w-auto object-contain object-left",
        sponsor.displayHeight ?? "h-5",
      )}
      aria-hidden
    />
  );
}

interface SponsorBadgeProps {
  sponsor: Sponsor;
}

export function SponsorBadge({ sponsor }: SponsorBadgeProps) {
  return (
    <a
      href={sponsor.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 cursor-pointer items-center opacity-60 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <SponsorLogoMark sponsor={sponsor} />
      <span className="sr-only">{sponsor.name}</span>
    </a>
  );
}
