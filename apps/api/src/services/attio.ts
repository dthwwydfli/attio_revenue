import { splitName } from "@leadloop/shared";
import { env } from "../lib/env.js";
import { http, HttpError } from "../lib/http.js";
import { createLogger } from "../lib/logger.js";

const ATTIO_BASE = "https://api.attio.com/v2";
const attioLogger = createLogger("attio");

export class AttioApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly responseBody: string,
  ) {
    super(`Attio ${path} failed (${status}): ${responseBody.slice(0, 300)}`);
    this.name = "AttioApiError";
  }
}

export interface PersonAttributeFields {
  lead_score?: number;
  lead_band?: string;
  routing_status?: string;
  agent_summary?: string;
  source?: string;
  last_agent_run_at?: string;
  [key: string]: unknown;
}

type AttioFetchOptions = {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

function extractRecordId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Attio response missing record id");
  }
  const d = data as Record<string, unknown>;
  const inner = d.data as Record<string, unknown> | undefined;
  const id = inner?.id as Record<string, unknown> | undefined;
  const recordId = (id?.record_id as string) ?? (inner?.record_id as string);
  if (!recordId) {
    throw new Error("Attio response missing record id");
  }
  return recordId;
}

function extractNoteId(data: unknown): string {
  const json = data as { data?: { id?: { note_id?: string } } };
  const noteId = json.data?.id?.note_id;
  if (!noteId) {
    throw new Error("Attio response missing note id");
  }
  return noteId;
}

function extractTaskId(data: unknown): string {
  const json = data as { data?: { id?: { task_id?: string } } };
  const taskId = json.data?.id?.task_id;
  if (!taskId) {
    throw new Error("Attio response missing task id");
  }
  return taskId;
}

function toAttioValues(fields: Record<string, unknown>): Record<string, unknown[]> {
  const values: Record<string, unknown[]> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined) continue;
    if (typeof val === "number" || typeof val === "string") {
      values[key] = [{ value: val }];
    } else {
      values[key] = [val];
    }
  }
  return values;
}

function noteTitleFromMarkdown(markdown: string): string {
  return (
    markdown
      .split("\n")
      .find((line) => line.trim().length > 0)
      ?.replace(/^#+\s*/, "")
      .slice(0, 120) ?? "Note"
  );
}

export async function attioFetch<T = unknown>(
  path: string,
  options: AttioFetchOptions = {},
): Promise<T> {
  const { method = "GET", body, timeoutMs, retries } = options;

  attioLogger.debug({ path, method }, "Attio request");

  try {
    const result = await http<T>(`${ATTIO_BASE}${path}`, {
      method,
      body,
      timeoutMs,
      retries,
      logger: attioLogger,
      headers: {
        Authorization: `Bearer ${env.attioApiKey}`,
      },
    });
    attioLogger.debug({ path, method }, "Attio response");
    return result;
  } catch (err) {
    if (err instanceof HttpError) {
      attioLogger.error({ path, status: err.status, body: err.body.slice(0, 500) }, "Attio error");
      throw new AttioApiError(err.status, path, err.body);
    }
    attioLogger.error({ path, err: String(err) }, "Attio request failed");
    throw err;
  }
}

export async function assertCompany(domain: string, name: string): Promise<{ companyId: string }> {
  const json = await attioFetch("/objects/companies/records?matching_attribute=domains", {
    method: "PUT",
    body: {
      data: {
        values: {
          name: [{ value: name }],
          domains: [{ domain }],
        },
      },
    },
  });
  return { companyId: extractRecordId(json) };
}

export async function assertPerson(
  email: string,
  name: string,
  companyId: string,
): Promise<{ personId: string }> {
  const { firstName, lastName } = splitName(name);

  const json = await attioFetch("/objects/people/records?matching_attribute=email_addresses", {
    method: "PUT",
    body: {
      data: {
        values: {
          email_addresses: [{ email_address: email }],
          name: [{ first_name: firstName, last_name: lastName, full_name: name }],
          company: [{ target_object: "companies", target_record_id: companyId }],
        },
      },
    },
  });
  return { personId: extractRecordId(json) };
}

export async function updatePersonAttributes(
  personId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const values = toAttioValues(fields);
  if (Object.keys(values).length === 0) return;

  await attioFetch(`/objects/people/records/${personId}`, {
    method: "PATCH",
    body: { data: { values } },
  });
}

export async function updateCompanyAttributes(
  companyId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const values = toAttioValues(fields);
  if (Object.keys(values).length === 0) return;

  await attioFetch(`/objects/companies/records/${companyId}`, {
    method: "PATCH",
    body: { data: { values } },
  });
}

export async function createNote(personId: string, markdown: string): Promise<{ noteId: string }> {
  const json = await attioFetch("/notes", {
    method: "POST",
    body: {
      data: {
        parent_object: "people",
        parent_record_id: personId,
        title: noteTitleFromMarkdown(markdown),
        format: "markdown",
        content: markdown,
      },
    },
  });
  return { noteId: extractNoteId(json) };
}

export async function createTask(
  personId: string,
  title: string,
  body: string,
): Promise<{ taskId: string }> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 2);

  const json = await attioFetch("/tasks", {
    method: "POST",
    body: {
      data: {
        content: `${title}\n\n${body}`,
        format: "plaintext",
        deadline_at: deadline.toISOString(),
        is_completed: false,
        linked_records: [{ target_object: "people", target_record_id: personId }],
      },
    },
  });
  return { taskId: extractTaskId(json) };
}
