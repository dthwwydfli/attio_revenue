import { apiFetch } from "@/lib/api-client";
import { LandingPage } from "@/components/landing/LandingPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let apiOnline: boolean | undefined;
  try {
    const health = await apiFetch<{ ok?: boolean }>("/health");
    apiOnline = health.ok === true;
  } catch {
    apiOnline = false;
  }

  return <LandingPage apiOnline={apiOnline} />;
}
