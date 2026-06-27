import { AttioApiError, attioFetch } from "./attio.js";

export async function listObjectAttributes(objectSlug: string): Promise<unknown> {
  return attioFetch(`/objects/${objectSlug}/attributes`);
}

async function createAttribute(
  objectSlug: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  try {
    return await attioFetch(`/objects/${objectSlug}/attributes`, {
      method: "POST",
      body: { data: payload },
    });
  } catch (err) {
    if (err instanceof AttioApiError) {
      const body = err.responseBody;
      if (body.includes("already exists") || body.includes("slug_conflict")) {
        return { skipped: true, reason: "Attribute already exists" };
      }
    }
    throw err;
  }
}

export async function createSelectAttribute(
  objectSlug: string,
  apiSlug: string,
  title: string,
  options: string[],
): Promise<unknown> {
  return createAttribute(objectSlug, {
    title,
    description: `LeadLoop ${title}`,
    api_slug: apiSlug,
    type: "select",
    is_required: false,
    is_unique: false,
    is_multiselect: false,
    config: {
      options: options.map((option) => ({ title: option })),
    },
  });
}

export async function createTextAttribute(
  objectSlug: string,
  apiSlug: string,
  title: string,
): Promise<unknown> {
  return createAttribute(objectSlug, {
    title,
    description: `LeadLoop ${title}`,
    api_slug: apiSlug,
    type: "text",
    is_required: false,
    is_unique: false,
    is_multiselect: false,
    config: {},
  });
}

export async function createNumberAttribute(
  objectSlug: string,
  apiSlug: string,
  title: string,
): Promise<unknown> {
  return createAttribute(objectSlug, {
    title,
    description: `LeadLoop ${title}`,
    api_slug: apiSlug,
    type: "number",
    is_required: false,
    is_unique: false,
    is_multiselect: false,
    config: {},
  });
}

export async function ensureSelectOptions(
  objectSlug: string,
  apiSlug: string,
  options: string[],
): Promise<void> {
  const attrs = (await listObjectAttributes(objectSlug)) as {
    data?: Array<{ api_slug: string; id?: { attribute_id?: string } }>;
  };
  const attr = attrs.data?.find((x) => x.api_slug === apiSlug);
  if (!attr?.id?.attribute_id) return;

  const existing = (await attioFetch(
    `/objects/${objectSlug}/attributes/${attr.id.attribute_id}/options`,
  )) as { data?: Array<{ title: string }> };
  const titles = new Set(existing.data?.map((o) => o.title) ?? []);

  for (const option of options) {
    if (titles.has(option)) continue;
    try {
      await attioFetch(`/objects/${objectSlug}/attributes/${attr.id.attribute_id}/options`, {
        method: "POST",
        body: { data: { title: option } },
      });
    } catch (err) {
      if (err instanceof AttioApiError) {
        const body = err.responseBody;
        if (body.includes("already exists") || body.includes("slug_conflict")) continue;
      }
      throw err;
    }
  }
}
