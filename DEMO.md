# 90-Second Demo Script

**Setup before pitch:** Tab 1 = `/demo/submit`. Tab 2 = Attio workspace. Tab 3 = n8n execution (optional).

| Time | Screen | Say |
|------|--------|-----|
| 0–10s | `/` landing | "When a lead arrives, your CRM shouldn't wait for a human. LeadLoop turns inbound into autonomous CRM action." |
| 10–25s | `/demo/submit` — click **Demo Hot** | "Sarah from Acme submits an enterprise inquiry. Watch the agent pipeline — not a rep." Click **Run agent pipeline**. |
| 25–45s | `/demo` stepper | "Enriched from public web data. Ranked against our ICP with Superlinked. Scored hot." |
| 45–60s | Generated reply card | "The agent drafts a personalized reply and decides next action — no static rules." |
| 60–75s | SLNG card + Attio tab | "For hot leads, SLNG voice engages. Everything writes back to Attio automatically." Switch to Attio — show note, score, task. |
| 75–90s | n8n + `/security` | "Orchestrated in n8n, secured with Aikido. The CRM acts — humans only review exceptions." |

## Punch lines

- "Attio is the source of truth; the agent is the operator."
- "Hot/warm/cold isn't a form rule — it's semantic ICP matching."
- "Voice is conditional, not spam — only when score warrants it."

## Replay buttons (no form needed)

From the home page, click **Hot / Warm / Cold** replay cards for instant pipeline runs.

## Backup if live demo fails

```bash
curl -X POST http://localhost:3001/demo/replay/hot
```

Show n8n execution graph and Attio record manually.
