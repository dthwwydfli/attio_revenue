# LeadLoop — Autonomous Lead Router

Turn inbound leads into autonomous CRM action loops. Built for the **Tech: Europe AI Hackathon** (Attio Agentic CRM track).

When a lead arrives, **n8n** orchestrates the workflow. **LeadLoop API** enriches from public web data, ranks against your ICP with **Superlinked**, generates personalized replies via LLM, triggers **SLNG** voice for hot leads, and writes everything back to **Attio** — the source of truth. Secured with **Aikido**.

## Architecture

```
Form/Webhook → n8n → LeadLoop API → [Enrich | Superlinked | LLM | SLNG] → Attio
                                              ↓
                                        Demo Dashboard
```

- **Source of truth:** Attio CRM
- **Orchestration:** n8n workflows
- **Business logic:** `apps/api` (Fastify)

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Attio API key ([developer settings](https://attio.com))
- Optional: Tavily, OpenAI, SLNG, Superlinked SIE keys

### Setup

```bash
cp .env.example .env
# Fill in ATTIO_API_KEY and ATTIO_WORKSPACE_SLUG at minimum

pnpm install
pnpm --filter @leadloop/shared build

# Create Attio custom attributes (run once)
pnpm --filter @leadloop/api attio:setup

# Test Attio connection
pnpm --filter @leadloop/api attio:test

# Start API + frontend
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:3000

### Superlinked SIE (optional)

```bash
docker compose -f docker-compose.sie.yml up -d
# Set SIE_BASE_URL=http://localhost:8080 in .env
```

Without SIE, scoring uses a deterministic mock fallback.

### n8n workflow

1. Import [`workflows/lead-router.json`](workflows/lead-router.json) into n8n
2. Set env var `LEADLOOP_API_URL` to your API URL
3. Activate workflow and copy the production webhook URL
4. POST lead JSON to the webhook, or connect your form

Example payload:

```json
{
  "name": "Sarah Chen",
  "email": "sarah.chen@acmecorp.io",
  "company": "Acme Corp",
  "role": "VP Revenue Operations",
  "message": "Evaluating agentic CRM tools for our SaaS team.",
  "phone": "+14155550100"
}
```

## Attio custom attributes

Run `pnpm --filter @leadloop/api attio:setup` or create manually:

**People:** `lead_score`, `lead_band`, `routing_status`, `agent_summary`, `source`

**Companies:** `enrichment_summary`, `employee_band`, `industry_tag`

## Demo

1. Open http://localhost:3000
2. Click **Demo Hot Lead** or go to `/demo/submit`
3. Submit → watch live pipeline at `/demo?leadId=...`
4. Click **Open in Attio** when complete

See [`DEMO.md`](DEMO.md) for the 90-second pitch script.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/leads/process` | Run full pipeline |
| GET | `/leads/:id` | Lead run detail |
| GET | `/leads/:id/status` | Poll status (frontend) |
| POST | `/demo/replay/:scenario` | Replay hot/warm/cold |
| POST | `/webhooks/slng` | SLNG callback |
| GET | `/icp` | ICP definition |
| GET | `/health` | Health check |

## Environment variables

See [`.env.example`](.env.example).

## Security

Aikido scans run on PRs via [`.github/workflows/aikido.yml`](.github/workflows/aikido.yml). Add `AIKIDO_SECRET_KEY` to GitHub secrets.

## Repo structure

```
apps/web/          Next.js demo dashboard
apps/api/          Fastify lead pipeline API
packages/shared/   Zod schemas + demo fixtures
workflows/         n8n workflow export
```

## Sponsors

Built to showcase **Attio**, **n8n**, **Superlinked**, **SLNG**, and **Aikido**.
