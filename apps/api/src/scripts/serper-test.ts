import "../lib/env.js";
import { env } from "../lib/env.js";

async function main() {
  if (!env.serperApiKey || env.serperApiKey.includes("placeholder")) {
    throw new Error("Set SERPER_API_KEY in .env.local (get one at https://serper.dev)");
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env.serperApiKey,
    },
    body: JSON.stringify({ q: "Acme Corp company profile" }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Serper API failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = JSON.parse(text) as { organic?: Array<{ title?: string }> };
  const count = json.organic?.length ?? 0;
  console.log(`PASS — Serper returned ${count} organic results`);
  if (json.organic?.[0]?.title) {
    console.log(`  First: ${json.organic[0].title}`);
  }
}

main().catch((err) => {
  console.error("FAIL —", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
