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

## Backend Setup

Layer 0 is the Fastify bootstrap: validated env, structured logging, shared HTTP client, and route registration. The lead pipeline, Attio client, enrichment, Superlinked scoring, LLM, and SLNG integrations are wired through the route handlers.

### Structure

```
apps/api/src/
├── index.ts           # Fastify entrypoint + graceful shutdown
├── routes/index.ts    # Route registration (pipeline, demo, webhooks)
├── pipeline.ts        # Full lead processing pipeline
├── lib/
│   ├── env.ts         # Zod-validated environment
│   ├── logger.ts      # Pino logger + child loggers per module
│   └── http.ts        # Shared fetch wrapper (timeout, retries, JSON)
├── services/
│   ├── attio.ts       # Typed Attio v2 client
│   ├── enrich.ts      # Layer 2 enrichment agent
│   └── scoring.ts     # Layer 3 Superlinked ICP scoring
└── types/global.ts    # Shared API response types
```

### Environment

All variables below are **required at startup**. Copy `.env.example` and fill every value. The API throws a descriptive error listing anything missing.

| Variable | Notes |
|----------|-------|
| `ATTIO_API_KEY` | Attio developer API key |
| `ATTIO_WORKSPACE_SLUG` | Workspace slug for record URLs |
| `OPENAI_API_KEY` or `GROQ_API_KEY` | At least one LLM provider |
| `TAVILY_API_KEY` | Optional live enrichment; fixtures/placeholder used when absent |
| `SIE_ENDPOINT` or `SIE_BASE_URL` + `SIE_API_KEY` | Superlinked hackathon GPU cluster |
| `SLNG_API_KEY`, `SLNG_AGENT_ID` | SLNG voice agent |
| `CORS_ORIGIN` | Frontend origin (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Public API URL for frontend |

### Scripts

```bash
pnpm install
pnpm --filter @leadloop/shared build

# Development (watch mode)
pnpm dev:api

# Production build + start
pnpm build:api
pnpm start:api
```

### Verify

```bash
curl http://localhost:3001/health
# → { "ok": true, "uptime": 12.34, "attio": true, ... }
```

### Logging

- **Development:** pretty-printed logs via `pino-pretty`
- **Production:** JSON logs (`NODE_ENV=production`)
- **Per-module:** `createLogger("module-name")` from `lib/logger.ts`

### Shared HTTP client

Use `http()` from `lib/http.ts` for outbound calls (enrichment, SLNG, SIE, etc.):

- 30s default timeout
- Retries on 429/5xx with exponential backoff
- `User-Agent: LeadLoop/1.0`
- Automatic JSON parse + structured error logging

---

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Attio API key ([developer settings](https://attio.com))
- Tavily (optional), OpenAI or Groq, SLNG, and Superlinked SIE keys (see `.env.example`)

### Setup

```bash
cp .env.example .env
# Fill in all required values listed in .env.example

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

### Superlinked SIE (hackathon cluster)

LeadLoop uses the **Superlinked hackathon GPU cluster** for ICP embedding scoring and optional open-model generation. No local Docker required.

```bash
# .env — already in .env.example
SIE_ENDPOINT=http://a64e1dc31032c40e4b1e9330a1273c83-1760332796.us-east-2.elb.amazonaws.com:8080
SIE_API_KEY=SL-...          # message Filip on Discord
SIE_ENCODE_GPU=l4           # embeddings / rerankers
SIE_LLM_MODEL=Qwen/Qwen3-4B-Instruct-2507
SIE_LLM_GPU=rtx6000         # warm generation lane (pre-loaded on cluster)

# Verify cluster connectivity + warm Qwen lane
pnpm --filter @leadloop/api sie:test
pnpm --filter @leadloop/api llm:test hot
pnpm --filter @leadloop/api scoring:test hot
```

Without SIE, scoring uses a deterministic heuristic fallback.

Optional local Docker (`docker-compose.sie.yml`) is only needed if the cluster is unreachable.

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
| GET | `/health` | Health check (`ok`, `uptime`, integration flags) |
| GET | `/icp` | ICP description for scoring |
| POST | `/leads/process` | Run full pipeline |
| GET | `/leads/:id` | Full lead run record |
| GET | `/leads/:id/status` | Poll status for frontend |
| GET | `/leads` | List recent runs |
| POST | `/demo/replay/:scenario` | Replay hot/warm/cold demo lead |
| POST | `/webhooks/slng` | SLNG voice callback |

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
