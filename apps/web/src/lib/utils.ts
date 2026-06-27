import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function bandColor(band?: string): string {
  switch (band) {
    case "hot":
      return "text-red-400 bg-red-400/10 border-red-400/30";
    case "warm":
      return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "cold":
      return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    case "needs_review":
      return "text-purple-400 bg-purple-400/10 border-purple-400/30";
    default:
      return "text-zinc-400 bg-zinc-400/10 border-zinc-400/30";
  }
}
