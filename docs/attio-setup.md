# Attio attribute setup reference

Create these custom attributes in Attio (or run `pnpm --filter @leadloop/api attio:setup` with `ATTIO_API_KEY` set).

## People object

| API slug | Type | Options |
|----------|------|---------|
| `lead_score` | Number | — |
| `lead_band` | Select | hot, warm, cold, needs_review |
| `routing_status` | Select | processing, routed, voice_pending, completed, failed |
| `agent_summary` | Text | — |
| `source` | Text | — |

## Companies object

| API slug | Type |
|----------|------|
| `enrichment_summary` | Text |
| `employee_band` | Text |
| `industry_tag` | Text |

## Optional list

Create a list named **Inbound Agent Queue** filtered on `lead_band` for demo visibility.
