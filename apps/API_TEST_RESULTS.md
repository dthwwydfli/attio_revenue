# LeadLoop API Test Results

**Run at:** 2026-06-27T13:31:29.209Z

| Status | Count |
|--------|-------|
| PASS | 5 |
| FAIL | 1 |
| SKIP (not configured) | 2 |
| STUB (not wired yet) | 4 |

## Results

### ✅ Attio (assert company + person + note)

**Status:** PASS

companyId=416e8a3b-615e-5a78-aead-2567885bfb56, personId=9a26ab1a-016c-5aa2-b8f2-0e7292989600, noteId=10f6f883-c19e-470b-a361-86f1ad7915a1

**Verify in browser:** https://app.attio.com/brunel-university/person/9a26ab1a-016c-5aa2-b8f2-0e7292989600

### ✅ Tavily enrichment

**Status:** PASS

source=tavily, domain=acmecorp.io

### ❌ Serper API

**Status:** FAIL

HTTP 403: {"message":"Unauthorized.","statusCode":403}

### ✅ Superlinked SIE

**Status:** PASS

HTTP 200 at http://localhost:8080

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

{"ok":true,"uptime":59.5860619}

### 🔧 HTTP POST /leads/process

**Status:** STUB

Returns 501 — pipeline not wired to routes yet (expected)

### 🔧 HTTP GET /leads/:id/status

**Status:** STUB

Returns 501 — expected until pipeline wired

### 🔧 HTTP POST /webhooks/slng

**Status:** STUB

Returns 501 — expected until SLNG webhook wired

### 🔧 HTTP POST /demo/replay/:scenario

**Status:** STUB

Returns 501 — expected until pipeline wired

## What to look for (no terminal needed)

1. **Attio** — Open the person URL above in Attio. You should see a new person, linked to Acme Corp, with a test note.
2. **Tavily** — PASS means live web enrichment works. Check `apps/api/src/fixtures/enrichment/acme-corp.json` for cached data.
3. **Serper** — PASS means fallback search API works if Tavily is down.
4. **HTTP /health** — Open http://localhost:3001/health in your browser. Should show `{"ok":true,"uptime":...}`.
5. **STUB routes** — 501 is correct for now; pipeline layers exist but routes are not connected yet.
6. **SKIP** — Add real keys to `.env.local` for OpenAI, SLNG, or start SIE Docker for those tests to pass.
