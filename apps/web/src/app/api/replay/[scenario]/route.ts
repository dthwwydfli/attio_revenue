import { redirect } from "next/navigation";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ scenario: string }> },
) {
  const { scenario } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const res = await fetch(`${apiUrl}/demo/replay/${scenario}`, { method: "POST" });
  if (!res.ok) {
    redirect("/demo?error=replay_failed");
  }

  const data = (await res.json()) as { leadRunId?: string };
  redirect(`/demo?leadId=${data.leadRunId ?? ""}`);
}
