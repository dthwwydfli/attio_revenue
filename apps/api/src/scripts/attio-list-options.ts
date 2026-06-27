import "../lib/env.js";
import { attioFetch } from "../services/attio.js";

async function main() {
  const attrs = (await attioFetch("/objects/people/attributes")) as {
    data?: Array<{ api_slug: string; type: string; id?: { attribute_id?: string } }>;
  };

  for (const slug of ["lead_band", "routing_status"]) {
    const attr = attrs.data?.find((x) => x.api_slug === slug);
    if (!attr?.id?.attribute_id) {
      console.log(`${slug}: not found`);
      continue;
    }
    const opts = (await attioFetch(
      `/objects/people/attributes/${attr.id.attribute_id}/options`,
    )) as { data?: Array<{ title: string }> };
    console.log(
      `${slug} (${attr.type}):`,
      opts.data?.map((o) => o.title).join(", ") ?? "none",
    );
  }
}

main().catch(console.error);
