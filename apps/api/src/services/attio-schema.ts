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
