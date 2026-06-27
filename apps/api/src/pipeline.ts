import { v4 as uuidv4 } from "uuid";
import type {
  LeadInput,
  LeadRun,
  AuditEvent,
  ProcessLeadResponse,
  PipelineStep,
  EnrichmentResult,
  ScoreResult,
  GeneratedAction,
} from "@leadloop/shared";
import { inferDomain } from "@leadloop/shared";
import { saveRun, updateRun, appendEvent, getRun } from "./store.js";
import { attioPersonUrl, attioCompanyUrl } from "./lib/env.js";
import {
  assertCompany,
  assertPerson,
  updatePersonAttributes,
  updateCompanyAttributes,
  createNote,
  createTask,
  AttioApiError,
} from "./services/attio.js";
import { enrichLead, buildProfileText } from "./services/enrich.js";
import { scoreLead } from "./services/superlinked.js";
import { generateAction } from "./services/llm.js";
import { dispatchVoiceTouchpoint } from "./services/slng.js";

function audit(step: PipelineStep, status: AuditEvent["status"], message?: string, durationMs?: number): AuditEvent {
  return {
    step,
    status,
    message,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}

function attioErrorMessage(err: unknown): string {
  if (err instanceof AttioApiError) return err.message;
  return err instanceof Error ? err.message : "Attio error";
}

async function upsertAttioRecords(
  input: LeadInput,
  domain: string,
): Promise<{
  personRecordId?: string;
  companyRecordId?: string;
  personUrl?: string;
  companyUrl?: string;
  skipped: boolean;
  reason?: string;
}> {
  try {
    const { companyId } = await assertCompany(domain, input.company);
    const { personId } = await assertPerson(input.email, input.name, companyId);

    if (input.role) {
      await updatePersonAttributes(personId, { job_title: input.role });
    }

    return {
      personRecordId: personId,
      companyRecordId: companyId,
      personUrl: attioPersonUrl(personId),
      companyUrl: attioCompanyUrl(companyId),
      skipped: false,
    };
  } catch (err) {
    return { skipped: true, reason: attioErrorMessage(err) };
  }
}

async function writebackToAttio(
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

  try {
    await updatePersonAttributes(personRecordId, {
      lead_score: score.score,
      lead_band: score.band,
      routing_status: "completed",
      agent_summary: action.rationale.slice(0, 500),
      source: input.source,
      last_agent_run_at: new Date().toISOString(),
    });

    if (companyRecordId) {
      await updateCompanyAttributes(companyRecordId, {
        enrichment_summary: enrichment.description?.slice(0, 500) ?? "",
        employee_band: enrichment.employee_band ?? "",
        industry_tag: enrichment.industry ?? "",
      });
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

    const { noteId } = await createNote(personRecordId, noteContent);

    let taskId: string | undefined;
    if (action.taskTitle && (score.band === "hot" || score.band === "warm" || score.band === "needs_review")) {
      const task = await createTask(
        personRecordId,
        action.taskTitle,
        action.taskBody ?? action.taskTitle,
      );
      taskId = task.taskId;
    }

    return { noteId, taskId, skipped: false };
  } catch (err) {
    return { skipped: true, reason: attioErrorMessage(err) };
  }
}

export async function processLead(input: LeadInput): Promise<ProcessLeadResponse> {
  const id = uuidv4();
  const now = new Date().toISOString();

  const run: LeadRun = {
    id,
    status: "processing",
    currentStep: "received",
    input,
    events: [audit("received", "completed", "Lead received")],
    createdAt: now,
    updatedAt: now,
  };
  saveRun(run);

  const domain = inferDomain(input.email, input.company, input.domain);

  try {
    // Step: Attio upsert
    updateRun(id, { currentStep: "attio_upsert" });
    appendEvent(id, audit("attio_upsert", "started"));
    const attioStart = Date.now();
    const attioUpsert = await upsertAttioRecords(input, domain);
    appendEvent(
      id,
      audit(
        "attio_upsert",
        attioUpsert.skipped ? "skipped" : "completed",
        attioUpsert.reason ?? `Person: ${attioUpsert.personRecordId ?? "n/a"}`,
        Date.now() - attioStart,
      ),
    );
    updateRun(id, {
      attio: {
        personRecordId: attioUpsert.personRecordId,
        companyRecordId: attioUpsert.companyRecordId,
        personUrl: attioUpsert.personUrl,
        companyUrl: attioUpsert.companyUrl,
        skipped: attioUpsert.skipped,
        reason: attioUpsert.reason,
      },
    });

    // Step: Enrich
    updateRun(id, { currentStep: "enriched" });
    appendEvent(id, audit("enriched", "started"));
    const enrichStart = Date.now();
    const enrichment = await enrichLead(input.company, domain);
    appendEvent(id, audit("enriched", "completed", enrichment.source, Date.now() - enrichStart));
    updateRun(id, { enrichment });

    // Step: Score
    updateRun(id, { currentStep: "scored" });
    appendEvent(id, audit("scored", "started"));
    const scoreStart = Date.now();
    const profileText = buildProfileText(input, enrichment, domain);
    const score = await scoreLead(profileText, undefined, input.source);
    appendEvent(
      id,
      audit("scored", "completed", `${score.band} (${score.score}) via ${score.source}`, Date.now() - scoreStart),
    );
    updateRun(id, { score });

    // Step: Generate action
    updateRun(id, { currentStep: "action_generated" });
    appendEvent(id, audit("action_generated", "started"));
    const actionStart = Date.now();
    const action = await generateAction(input, enrichment, score);
    appendEvent(id, audit("action_generated", "completed", action.source, Date.now() - actionStart));
    updateRun(id, { action });

    // Step: Voice (hot + phone)
    updateRun(id, { currentStep: "voice", status: score.band === "hot" && input.phone ? "voice_pending" : "routed" });
    appendEvent(id, audit("voice", "started"));
    const voiceStart = Date.now();
    let slng;
    if (score.band === "hot" && action.shouldCallVoice) {
      slng = await dispatchVoiceTouchpoint(input, action);
    } else {
      slng = { status: "skipped" as const };
    }
    appendEvent(
      id,
      audit("voice", slng.status === "skipped" ? "skipped" : "completed", slng.status, Date.now() - voiceStart),
    );
    updateRun(id, { slng });

    // Step: Attio writeback
    updateRun(id, { currentStep: "attio_writeback" });
    appendEvent(id, audit("attio_writeback", "started"));
    const writebackStart = Date.now();
    const existingRun = getRun(id)!;
    const writeback = await writebackToAttio(
      existingRun.attio?.personRecordId,
      existingRun.attio?.companyRecordId,
      input,
      enrichment,
      score,
      action,
      slng.transcriptSnippet,
    );
    appendEvent(
      id,
      audit(
        "attio_writeback",
        writeback.skipped ? "skipped" : "completed",
        writeback.noteId ? `Note ${writeback.noteId}` : writeback.reason,
        Date.now() - writebackStart,
      ),
    );

    updateRun(id, {
      status: "completed",
      currentStep: "completed",
      attio: {
        ...existingRun.attio,
        noteId: writeback.noteId,
        taskId: writeback.taskId,
        skipped: writeback.skipped,
        reason: writeback.reason,
      },
    });
    appendEvent(id, audit("completed", "completed", "Pipeline finished"));

    const finalRun = getRun(id)!;
    return {
      leadRunId: id,
      status: "completed",
      band: score.band,
      attioPersonUrl: finalRun.attio?.personUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown pipeline error";
    updateRun(id, { status: "failed", currentStep: "failed", error: message });
    appendEvent(id, audit("failed", "failed", message));
    return { leadRunId: id, status: "failed" };
  }
}
