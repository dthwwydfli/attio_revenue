import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ scenario: string }> },
) {
  const { scenario } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  try {
    const res = await fetch(`${apiUrl}/demo/replay/${scenario}`, { method: "POST" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `API replay failed (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { leadRunId?: string };
    if (!data.leadRunId) {
      return NextResponse.json({ error: "API did not return a leadRunId" }, { status: 502 });
    }

    return NextResponse.json({ leadRunId: data.leadRunId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Cannot reach API at ${apiUrl}: ${message}` }, { status: 503 });
  }
}
