import type { LeadInput, EnrichmentResult, ScoreResult, GeneratedAction } from "@leadloop/shared";
import { splitName } from "@leadloop/shared";
import { env, attioPersonUrl, attioCompanyUrl } from "../config.js";

const ATTIO_BASE = "https://api.attio.com/v2";

async function attioFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!env.attioApiKey) {
    throw new Error("ATTIO_API_KEY not configured");
  }
  return fetch(`${ATTIO_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.attioApiKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

function extractRecordId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const inner = d.data as Record<string, unknown> | undefined;
  const id = inner?.id as Record<string, unknown> | undefined;
  return (id?.record_id as string) ?? (inner?.record_id as string);
}

export interface AttioUpsertResult {
  personRecordId?: string;
  companyRecordId?: string;
  personUrl?: string;
  companyUrl?: string;
  skipped: boolean;
  reason?: string;
}

export async function assertCompany(
  companyName: string,
  domain: string,
): Promise<{ recordId?: string; skipped: boolean; reason?: string }> {
  if (!env.attioApiKey) {
    return { skipped: true, reason: "ATTIO_API_KEY not configured" };
  }

  try {
    const res = await attioFetch("/objects/companies/records?matching_attribute=domains", {
      method: "PUT",
      body: JSON.stringify({
        data: {
          values: {
            name: [{ value: companyName }],
            domains: [{ domain }],
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { skipped: true, reason: `Company assert failed: ${res.status} ${text}` };
    }

    const json = await res.json();
    return { recordId: extractRecordId(json), skipped: false };
  } catch (err) {
    return { skipped: true, reason: err instanceof Error ? err.message : "Company assert error" };
  }
}

export async function assertPerson(
  input: LeadInput,
  companyRecordId?: string,
): Promise<{ recordId?: string; skipped: boolean; reason?: string }> {
  if (!env.attioApiKey) {
    return { skipped: true, reason: "ATTIO_API_KEY not configured" };
  }

  const { firstName, lastName } = splitName(input.name);

  const values: Record<string, unknown> = {
    email_addresses: [{ email_address: input.email }],
    name: [{ first_name: firstName, last_name: lastName, full_name: input.name }],
  };

  if (input.role) {
    values.job_title = [{ value: input.role }];
  }

  if (companyRecordId) {
    values.company = [{ target_object: "companies", target_record_id: companyRecordId }];
  }

  try {
    const res = await attioFetch("/objects/people/records?matching_attribute=email_addresses", {
      method: "PUT",
      body: JSON.stringify({ data: { values } }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { skipped: true, reason: `Person assert failed: ${res.status} ${text}` };
    }

    const json = await res.json();
    return { recordId: extractRecordId(json), skipped: false };
  } catch (err) {
    return { skipped: true, reason: err instanceof Error ? err.message : "Person assert error" };
  }
}

export async function upsertLeadRecords(input: LeadInput, domain: string): Promise<AttioUpsertResult> {
  const company = await assertCompany(input.company, domain);
  const person = await assertPerson(input, company.recordId);

  return {
    personRecordId: person.recordId,
    companyRecordId: company.recordId,
    personUrl: person.recordId ? attioPersonUrl(person.recordId) : undefined,
    companyUrl: company.recordId ? attioCompanyUrl(company.recordId) : undefined,
    skipped: person.skipped && company.skipped,
    reason: person.reason ?? company.reason,
  };
}

export async function updatePersonAttributes(
  personRecordId: string,
  attrs: Record<string, unknown>,
): Promise<boolean> {
  if (!env.attioApiKey) return false;

  const values: Record<string, unknown[]> = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val === "number") {
      values[key] = [{ value: val }];
    } else if (typeof val === "string") {
      values[key] = [{ value: val }];
    }
  }

  const res = await attioFetch(`/objects/people/records/${personRecordId}`, {
    method: "PATCH",
    body: JSON.stringify({ data: { values } }),
  });

  return res.ok;
}

export async function updateCompanyAttributes(
  companyRecordId: string,
  attrs: Record<string, unknown>,
): Promise<boolean> {
  if (!env.attioApiKey) return false;

  const values: Record<string, unknown[]> = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val === "string") {
      values[key] = [{ value: val }];
    }
  }

  const res = await attioFetch(`/objects/companies/records/${companyRecordId}`, {
    method: "PATCH",
    body: JSON.stringify({ data: { values } }),
  });

  return res.ok;
}

export async function createNote(
  parentObject: "people" | "companies",
  parentRecordId: string,
  title: string,
  content: string,
): Promise<{ noteId?: string; skipped: boolean; reason?: string }> {
  if (!env.attioApiKey) {
    return { skipped: true, reason: "ATTIO_API_KEY not configured" };
  }

  const res = await attioFetch("/notes", {
    method: "POST",
    body: JSON.stringify({
      data: {
        parent_object: parentObject,
        parent_record_id: parentRecordId,
        title,
        format: "markdown",
        content,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { skipped: true, reason: `Note create failed: ${res.status} ${text}` };
  }

  const json = (await res.json()) as { data?: { id?: { note_id?: string } } };
  return { noteId: json.data?.id?.note_id, skipped: false };
}

export async function createTask(
  personRecordId: string,
  title: string,
  content: string,
): Promise<{ taskId?: string; skipped: boolean; reason?: string }> {
  if (!env.attioApiKey) {
    return { skipped: true, reason: "ATTIO_API_KEY not configured" };
  }

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 2);

  const res = await attioFetch("/tasks", {
    method: "POST",
    body: JSON.stringify({
      data: {
        content,
        format: "plaintext",
        deadline_at: deadline.toISOString(),
        is_completed: false,
        linked_records: [
          { target_object: "people", target_record_id: personRecordId },
        ],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { skipped: true, reason: `Task create failed: ${res.status} ${text}` };
  }

  const json = (await res.json()) as { data?: { id?: { task_id?: string } } };
  return { taskId: json.data?.id?.task_id, skipped: false };
}

export async function writebackLead(
  personRecordId: string | undefined,
  companyRecordId: string | undefined,
  input: LeadInput,
  enrichment: EnrichmentResult,
  score: ScoreResult,
  action: GeneratedAction,
  slngTranscript?: string,
): Promise<{
  noteId?: string;
  taskId?: string;
  skipped: boolean;
  reason?: string;
}> {
  if (!personRecordId) {
    return { skipped: true, reason: "No person record ID for writeback" };
  }

  await updatePersonAttributes(personRecordId, {
    lead_score: score.score,
    lead_band: score.band,
    routing_status: "completed",
    agent_summary: action.rationale.slice(0, 500),
    source: input.source,
  }).catch(() => false);

  if (companyRecordId) {
    await updateCompanyAttributes(companyRecordId, {
      enrichment_summary: enrichment.description.slice(0, 500),
      employee_band: enrichment.employeeBand,
      industry_tag: enrichment.industry,
    }).catch(() => false);
  }

  const noteContent = [
    `## LeadLoop Agent Run`,
    ``,
    `**Band:** ${score.band} (${score.score}/100)`,
    `**Score reasons:** ${score.rankReasons.join("; ")}`,
    ``,
    `### Enrichment`,
    enrichment.description,
    enrichment.news.length ? `\n**News:** ${enrichment.news.join(" | ")}` : "",
    ``,
    `### Generated Reply`,
    `**Subject:** ${action.replySubject}`,
    ``,
    action.replyBody,
    slngTranscript ? `\n### Voice Touchpoint\n${slngTranscript}` : "",
  ].join("\n");

  const note = await createNote("people", personRecordId, `LeadLoop: ${score.band.toUpperCase()} lead routed`, noteContent);

  let taskId: string | undefined;
  if (action.taskTitle && (score.band === "hot" || score.band === "warm" || score.band === "needs_review")) {
    const task = await createTask(
      personRecordId,
      action.taskTitle,
      action.taskBody ?? action.taskTitle,
    );
    taskId = task.taskId;
  }

  return { noteId: note.noteId, taskId, skipped: note.skipped, reason: note.reason };
}

export async function listObjectAttributes(objectSlug: string): Promise<unknown> {
  const res = await attioFetch(`/objects/${objectSlug}/attributes`);
  if (!res.ok) throw new Error(`Failed to list attributes: ${res.status}`);
  return res.json();
}

export async function createSelectAttribute(
  objectSlug: string,
  apiSlug: string,
  title: string,
  options: string[],
): Promise<unknown> {
  const res = await attioFetch(`/objects/${objectSlug}/attributes`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        title,
        description: `LeadLoop ${title}`,
        api_slug: apiSlug,
        type: "select",
        is_required: false,
        is_unique: false,
        is_multiselect: false,
        config: {
          options: options.map((title) => ({ title })),
        },
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    if (text.includes("already exists") || text.includes("slug_conflict")) {
      return { skipped: true, reason: "Attribute already exists" };
    }
    throw new Error(`Create attribute failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

export async function createTextAttribute(
  objectSlug: string,
  apiSlug: string,
  title: string,
): Promise<unknown> {
  const res = await attioFetch(`/objects/${objectSlug}/attributes`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        title,
        description: `LeadLoop ${title}`,
        api_slug: apiSlug,
        type: "text",
        is_required: false,
        is_unique: false,
        is_multiselect: false,
        config: {},
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    if (text.includes("already exists") || text.includes("slug_conflict")) {
      return { skipped: true, reason: "Attribute already exists" };
    }
    throw new Error(`Create attribute failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

export async function createNumberAttribute(
  objectSlug: string,
  apiSlug: string,
  title: string,
): Promise<unknown> {
  const res = await attioFetch(`/objects/${objectSlug}/attributes`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        title,
        description: `LeadLoop ${title}`,
        api_slug: apiSlug,
        type: "number",
        is_required: false,
        is_unique: false,
        is_multiselect: false,
        config: {},
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    if (text.includes("already exists") || text.includes("slug_conflict")) {
      return { skipped: true, reason: "Attribute already exists" };
    }
    throw new Error(`Create attribute failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}
