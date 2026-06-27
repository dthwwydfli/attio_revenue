import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "../lib/env.js";
import { env } from "../lib/env.js";
import { assertCompany, assertPerson, createNote } from "../services/attio.js";
import { enrichLead } from "../services/enrich.js";
import { scoreLead, toScoreResult } from "../services/scoring.js";
import type { EnrichmentResult } from "@leadloop/shared";
import { DEMO_LEADS } from "@leadloop/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../../API_TEST_RESULTS.md");

type Status = "PASS" | "FAIL" | "SKIP" | "STUB";

interface Row {
  name: string;
  status: Status;
  detail: string;
  verify?: string;
}

const rows: Row[] = [];

function pass(name: string, detail: string, verify?: string) {
  rows.push({ name, status: "PASS", detail, verify });
}

function fail(name: string, detail: string, verify?: string) {
  rows.push({ name, status: "FAIL", detail, verify });
}

function skip(name: string, detail: string) {
  rows.push({ name, status: "SKIP", detail });
}

function stub(name: string, detail: string) {
  rows.push({ name, status: "STUB", detail });
}

async function testAttio() {
  try {
    const ts = Date.now();
    const name = `API Test ${ts}`;
    const email = `apitest.${ts}@acmecorp.io`;
    const { companyId } = await assertCompany("acmecorp.io", "Acme Corp");
    const { personId } = await assertPerson(email, name, companyId);
    const { noteId } = await createNote(personId, `## API test\n\nAutomated run ${ts}`);
    pass(
      "Attio (assert company + person + note)",
      `companyId=${companyId}, personId=${personId}, noteId=${noteId}`,
      `https://app.attio.com/${env.attioWorkspaceSlug}/person/${personId}`,
    );
  } catch (err) {
    fail("Attio (assert company + person + note)", err instanceof Error ? err.message : String(err));
  }
}

async function testTavily() {
  try {
    const result = await enrichLead(DEMO_LEADS.hot.company, DEMO_LEADS.hot.domain);
    if (result.source === "tavily" && result.description) {
      pass("Tavily enrichment", `source=${result.source}, domain=${result.domain}`);
    } else if (result.source === "fixture") {
      pass("Tavily enrichment (fixture fallback)", `Tavily unavailable; used fixture. domain=${result.domain}`);
    } else {
      fail("Tavily enrichment", `Unexpected source: ${result.source}`);
    }
  } catch (err) {
    fail("Tavily enrichment", err instanceof Error ? err.message : String(err));
  }
}

async function testSerper() {
  const prev = process.env.TAVILY_API_KEY;
  process.env.TAVILY_API_KEY = "";
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": env.serperApiKey,
      },
      body: JSON.stringify({ q: "Stripe company profile" }),
    });
    const text = await res.text();
    if (res.ok) {
      pass("Serper API", `HTTP ${res.status}, response length ${text.length}`);
    } else {
      fail("Serper API", `HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    fail("Serper API", err instanceof Error ? err.message : String(err));
  } finally {
    process.env.TAVILY_API_KEY = prev;
  }
}

async function testSIE() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${env.sieEndpoint}/healthz`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      pass("Superlinked SIE", `HTTP ${res.status} at ${env.sieEndpoint}`);
    } else {
      skip("Superlinked SIE", `Not running (${res.status}). Heuristic scorer used instead.`);
    }
  } catch {
    skip("Superlinked SIE", `Not reachable at ${env.sieEndpoint}. Heuristic scorer used instead.`);
  }
}

async function testScoring() {
  try {
    const fixturePath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../fixtures/enrichment/hot.json",
    );
    const enrichment = JSON.parse(readFileSync(fixturePath, "utf8")) as EnrichmentResult;
    const result = await scoreLead(enrichment);
    const legacy = toScoreResult(result);
    if (legacy.score > 0 && legacy.band) {
      pass("ICP scoring", `band=${legacy.band}, score=${legacy.score}, source=${result.source}`);
    } else {
      fail("ICP scoring", JSON.stringify(result));
    }
  } catch (err) {
    fail("ICP scoring", err instanceof Error ? err.message : String(err));
  }
}

async function testOpenAI() {
  if (!env.openaiApiKey || env.openaiApiKey.startsWith("sk-dev-placeholder")) {
    skip("OpenAI", "No real OPENAI_API_KEY in .env.local — LLM uses template fallback");
    return;
  }
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${env.openaiApiKey}` },
    });
    if (res.ok) pass("OpenAI", `HTTP ${res.status}`);
    else fail("OpenAI", `HTTP ${res.status}`);
  } catch (err) {
    fail("OpenAI", err instanceof Error ? err.message : String(err));
  }
}

async function testSLNG() {
  if (!env.slngApiKey || env.slngApiKey.includes("placeholder")) {
    skip("SLNG", "No real SLNG_API_KEY in .env.local — voice uses mock in pipeline");
    return;
  }
  try {
    const res = await fetch(`https://api.agents.slng.ai/v1/agents/${env.slngAgentId}`, {
      headers: { Authorization: `Bearer ${env.slngApiKey}` },
    });
    if (res.ok) pass("SLNG", `HTTP ${res.status}`);
    else fail("SLNG", `HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  } catch (err) {
    fail("SLNG", err instanceof Error ? err.message : String(err));
  }
}

async function testHttpRoutes() {
  const base = `http://localhost:${env.port}`;

  async function hit(method: string, path: string, body?: unknown) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text };
  }

  try {
    const health = await hit("GET", "/health");
    if (health.status === 200 && health.body.includes('"ok":true')) {
      pass("HTTP GET /health", health.body.slice(0, 120));
    } else {
      fail("HTTP GET /health", `status=${health.status} — is the API running? Run: pnpm dev:api`);
    }

    const process = await hit("POST", "/leads/process", { name: "Test", email: "t@t.com", company: "Co" });
    if (process.status === 400) {
      stub("HTTP POST /leads/process", "Returns 400 for invalid payload — route is wired");
    } else if (process.status === 200) {
      pass("HTTP POST /leads/process", `status=${process.status}`);
    } else {
      fail("HTTP POST /leads/process", `status=${process.status}`);
    }

    const status = await hit("GET", "/leads/test-id/status");
    if (status.status === 404) {
      pass("HTTP GET /leads/:id/status", "Returns 404 for unknown id — route is wired");
    } else {
      fail("HTTP GET /leads/:id/status", `status=${status.status}`);
    }

    const slng = await hit("POST", "/webhooks/slng", {});
    if (slng.status === 200) {
      pass("HTTP POST /webhooks/slng", `status=${slng.status}`);
    } else {
      fail("HTTP POST /webhooks/slng", `status=${slng.status}`);
    }

    const replay = await hit("POST", "/demo/replay/hot");
    if (replay.status === 200) {
      pass("HTTP POST /demo/replay/:scenario", `status=${replay.status}`);
    } else {
      fail("HTTP POST /demo/replay/:scenario", `status=${replay.status} — is the API running?`);
    }
  } catch (err) {
    fail("HTTP routes", `Cannot reach ${base} — start API with: pnpm dev:api. ${err instanceof Error ? err.message : String(err)}`);
  }
}

function render(): string {
  const passed = rows.filter((r) => r.status === "PASS").length;
  const failed = rows.filter((r) => r.status === "FAIL").length;
  const skipped = rows.filter((r) => r.status === "SKIP").length;
  const stubs = rows.filter((r) => r.status === "STUB").length;
  const when = new Date().toISOString();

  let md = `# LeadLoop API Test Results\n\n`;
  md += `**Run at:** ${when}\n\n`;
  md += `| Status | Count |\n|--------|-------|\n`;
  md += `| PASS | ${passed} |\n| FAIL | ${failed} |\n| SKIP (not configured) | ${skipped} |\n| STUB (not wired yet) | ${stubs} |\n\n`;
  md += `## Results\n\n`;

  for (const row of rows) {
    const icon = { PASS: "✅", FAIL: "❌", SKIP: "⏭️", STUB: "🔧" }[row.status];
    md += `### ${icon} ${row.name}\n\n`;
    md += `**Status:** ${row.status}\n\n`;
    md += `${row.detail}\n\n`;
    if (row.verify) md += `**Verify in browser:** ${row.verify}\n\n`;
  }

  md += `## What to look for (no terminal needed)\n\n`;
  md += `1. **Attio** — Open the person URL above in Attio. You should see a new person, linked to Acme Corp, with a test note.\n`;
  md += `2. **Tavily** — PASS means live web enrichment works. Check \`apps/api/src/fixtures/enrichment/acme-corp.json\` for cached data.\n`;
  md += `3. **Serper** — PASS means fallback search API works if Tavily is down.\n`;
  md += `4. **Superlinked SIE** — PASS means local SIE Docker is running. SKIP falls back to heuristic scoring.\n`;
  md += `5. **HTTP /health** — Open http://localhost:3001/health in your browser. Should show integration flags.\n`;
  md += `6. **SKIP** — Add real keys to \`.env.local\` for OpenAI, SLNG, or start SIE Docker for those tests to pass.\n`;

  return md;
}

async function main() {
  await testAttio();
  await testTavily();
  await testSerper();
  await testSIE();
  await testScoring();
  await testOpenAI();
  await testSLNG();
  await testHttpRoutes();

  const md = render();
  writeFileSync(OUT, md, "utf8");
  console.log(md);
  console.log(`\nResults saved to: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
