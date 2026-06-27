# LeadLoop API Test Results

**Run at:** 2026-06-27T15:57:25.039Z

| Status | Count |
|--------|-------|
| PASS | 10 |
| FAIL | 0 |
| SKIP (not configured) | 3 |
| STUB (not wired yet) | 0 |

## Results

### ✅ Attio (assert company + person + note)

**Status:** PASS

companyId=416e8a3b-615e-5a78-aead-2567885bfb56, personId=8b535760-debd-565d-a409-1ccf4ad3a0e5, noteId=980469fd-91e9-4ecc-a160-7c5ee03ef28a

**Verify in browser:** https://app.attio.com/brunel-university/person/8b535760-debd-565d-a409-1ccf4ad3a0e5

### ✅ Tavily enrichment

**Status:** PASS

source=tavily, domain=acmecorp.io

### ✅ Enrichment fallback

**Status:** PASS

Live Tavily returned data (source=tavily)

### ✅ Superlinked SIE

**Status:** PASS

HTTP 200 at http://a64e1dc31032c40e4b1e9330a1273c83-1760332796.us-east-2.elb.amazonaws.com:8080

### ✅ ICP scoring

**Status:** PASS

band=hot, score=86, source=superlinked

### ⏭️ OpenAI

**Status:** SKIP

No real OPENAI_API_KEY in .env.local — LLM uses template fallback

### ⏭️ SLNG

**Status:** SKIP

No real SLNG_API_KEY in .env.local — voice uses mock in pipeline

### ⏭️ n8n webhook

**Status:** SKIP

Webhook not registered (404) — import workflows/pipeline-callback.json in n8n and activate it

### ✅ HTTP GET /health

**Status:** PASS

{"ok":true,"uptime":248.0435761,"attio":true,"tavily":true,"openai":false,"slng":true,"sie":"http://a64e1dc31032c40e4b1e

### ✅ HTTP POST /leads/process

**Status:** PASS

status=200, pipeline ok=true

### ✅ HTTP GET /leads/:id/status

**Status:** PASS

Returns 404 for unknown id — route is wired

### ✅ HTTP POST /webhooks/slng

**Status:** PASS

Returns 200 { ok: true }

### ✅ HTTP POST /demo/replay/:scenario

**Status:** PASS

status=200, pipeline ok=true

## What to look for (no terminal needed)

1. **Attio** — Open the person URL above in Attio. You should see a new person, linked to Acme Corp, with a test note.
2. **Tavily** — PASS means live web enrichment works. Check `apps/api/src/fixtures/enrichment/acme-corp.json` for cached data.
3. **Enrichment fallback** — PASS means fixture/placeholder fallback works when Tavily is unavailable.
4. **SLNG webhook** — PASS means POST /webhooks/slng returns 200 { ok: true }.
5. **n8n** — PASS means N8N_WEBHOOK_URL is set and accepts pipeline callbacks.
6. **HTTP /health** — Open http://localhost:3001/health in your browser. Should show `{"ok":true,"uptime":...}`.
7. **SKIP** — Add real keys to `.env.local` for OpenAI, SLNG, or n8n webhook URL.
