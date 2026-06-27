import type { ApproveLeadResponse, LeadRun } from "@leadloop/shared";
import { appendEvent, updateRun } from "../store.js";
import { createNote, updatePersonAttributes, AttioApiError } from "./attio.js";

const IN_FLIGHT_STATUSES = new Set(["processing", "voice_pending", "routed"]);

function formatEmailBody(body: string): string {
  return body.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function buildMailtoUrl(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    subject,
    body: formatEmailBody(body),
  });
  return `mailto:${email}?${params.toString()}`;
}

async function writeApprovalToAttio(
  run: LeadRun,
  band: string | undefined,
): Promise<void> {
  const personId = run.attio?.personRecordId;
  if (!personId) return;

  try {
    await updatePersonAttributes(personId, { routing_status: "completed" });
  } catch {
    // Non-fatal — select options may differ per workspace
  }

  const isCold = band === "cold";
  const noteContent = isCold
    ? [
        "## LeadLoop — Nurture confirmed",
        "",
        `Human reviewer confirmed nurture queue for **${run.input.name}** (${run.input.company}).`,
        "",
        "No autonomous outreach will be sent.",
      ].join("\n")
    : [
        "## LeadLoop — Human approved outreach",
        "",
        `Reviewer approved sending the generated reply to **${run.input.name}**.`,
        "",
        run.action?.replySubject ? `**Subject:** ${run.action.replySubject}` : "",
        run.action?.replyBody ? `\n${formatEmailBody(run.action.replyBody)}` : "",
      ]
        .filter(Boolean)
        .join("\n");

  try {
    await createNote(personId, noteContent);
  } catch (err) {
    if (err instanceof AttioApiError) throw err;
    throw err;
  }
}

export async function approveLead(run: LeadRun): Promise<ApproveLeadResponse> {
  if (IN_FLIGHT_STATUSES.has(run.status)) {
    throw new ApprovalError("Pipeline still processing", 409);
  }

  if (run.status === "failed") {
    throw new ApprovalError("Cannot approve a failed pipeline run", 409);
  }

  const approvedAt = run.approvedAt ?? new Date().toISOString();

  if (run.humanApproved) {
    const band = run.score?.band;
    const mailtoUrl =
      band === "hot" || band === "warm"
        ? run.action
          ? buildMailtoUrl(run.input.email, run.action.replySubject, run.action.replyBody)
          : undefined
        : undefined;

    return { ok: true, humanApproved: true, approvedAt, mailtoUrl };
  }

  if (!run.action) {
    throw new ApprovalError("No generated action to approve", 409);
  }

  await writeApprovalToAttio(run, run.score?.band);

  updateRun(run.id, { humanApproved: true, approvedAt });
  appendEvent(run.id, {
    step: "completed",
    status: "completed",
    message: "Human approved outreach",
    timestamp: approvedAt,
  });

  const band = run.score?.band;
  const mailtoUrl =
    band === "hot" || band === "warm"
      ? buildMailtoUrl(run.input.email, run.action.replySubject, run.action.replyBody)
      : undefined;

  return { ok: true, humanApproved: true, approvedAt, mailtoUrl };
}

export class ApprovalError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApprovalError";
  }
}
