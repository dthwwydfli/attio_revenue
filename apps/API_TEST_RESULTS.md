# LeadLoop API Test Results

**Run at:** 2026-06-27T14:38:23.557Z

| Status | Count |
|--------|-------|
| PASS | 7 |
| FAIL | 0 |
| SKIP (not configured) | 2 |
| STUB (not wired yet) | 3 |

## Results

### ✅ Attio (assert company + person + note)

**Status:** PASS

companyId=416e8a3b-615e-5a78-aead-2567885bfb56, personId=14f53d7e-0182-5038-acec-d95b0944cc99, noteId=70f4055d-2bab-4aa6-aa93-4201fce901a6

**Verify in browser:** https://app.attio.com/brunel-university/person/14f53d7e-0182-5038-acec-d95b0944cc99

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

### ✅ HTTP GET /health

**Status:** PASS

{"ok":true,"uptime":30.9954351}

### 🔧 HTTP POST /leads/process

**Status:** STUB

Returns 501 — pipeline not wired to routes yet (expected)

### 🔧 HTTP GET /leads/:id/status

**Status:** STUB

Returns 501 — expected until pipeline wired

### ✅ HTTP POST /webhooks/slng

**Status:** PASS

Returns 200 { ok: true }

### 🔧 HTTP POST /demo/replay/:scenario

**Status:** STUB

Returns 501 — expected until pipeline wired

## What to look for (no terminal needed)

1. **Attio** — Open the person URL above in Attio. You should see a new person, linked to Acme Corp, with a test note.
2. **Tavily** — PASS means live web enrichment works. Check `apps/api/src/fixtures/enrichment/acme-corp.json` for cached data.
3. **Enrichment fallback** — PASS means fixture/placeholder fallback works when Tavily is unavailable.
4. **SLNG webhook** — PASS means POST /webhooks/slng returns 200 { ok: true }.
5. **HTTP /health** — Open http://localhost:3001/health in your browser. Should show `{"ok":true,"uptime":...}`.
6. **STUB routes** — 501 is correct for now; pipeline layers exist but routes are not connected yet.
7. **SKIP** — Add real keys to `.env.local` for OpenAI, SLNG, or start SIE Docker for those tests to pass.
