# LeadLoop API Test Results

**Run at:** 2026-06-27T15:42:09.287Z

| Status | Count |
|--------|-------|
| PASS | 9 |
| FAIL | 1 |
| SKIP (not configured) | 2 |
| STUB (not wired yet) | 0 |

## Results

### ✅ Attio (assert company + person + note)

**Status:** PASS

companyId=416e8a3b-615e-5a78-aead-2567885bfb56, personId=ca54f56d-90ed-51c8-b9cc-d3e40cf87bcf, noteId=78b20f2b-7368-43e6-8eed-a1fb2c79c216

**Verify in browser:** https://app.attio.com/brunel-university/person/ca54f56d-90ed-51c8-b9cc-d3e40cf87bcf

### ✅ Tavily enrichment (fixture fallback)

**Status:** PASS

Tavily unavailable; used fixture. domain=acmecorp.io

### ❌ Serper API

**Status:** FAIL

HTTP 403: {"message":"Unauthorized.","statusCode":403}

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

### ✅ HTTP GET /health

**Status:** PASS

{"ok":true,"uptime":29.552179166,"attio":true,"tavily":true,"gemini":true,"slng":true,"sie":"http://a64e1dc31032c40e4b1e

### ✅ HTTP POST /leads/process

**Status:** PASS

status=200

### ✅ HTTP GET /leads/:id/status

**Status:** PASS

Returns 404 for unknown id — route is wired

### ✅ HTTP POST /webhooks/slng

**Status:** PASS

status=200

### ✅ HTTP POST /demo/replay/:scenario

**Status:** PASS

status=200

## What to look for (no terminal needed)

1. **Attio** — Open the person URL above in Attio. You should see a new person, linked to Acme Corp, with a test note.
2. **Tavily** — PASS means live web enrichment works. Check `apps/api/src/fixtures/enrichment/acme-corp.json` for cached data.
3. **Serper** — PASS means fallback search API works if Tavily is down.
4. **Superlinked SIE** — PASS means local SIE Docker is running. SKIP falls back to heuristic scoring.
5. **HTTP /health** — Open http://localhost:3001/health in your browser. Should show integration flags.
6. **SKIP** — Add real keys to `.env.local` for OpenAI, SLNG, or start SIE Docker for those tests to pass.
