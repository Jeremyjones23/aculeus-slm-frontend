import { buildActionBriefResponse, buildCaseBoardResponse, hardenInvestigationQuery } from "./aculeus-source-fed-contracts.js";
import { planOfficialApiTasks } from "./aculeus-official-source-router.js";
import { collectProviderCandidates } from "./aculeus-provider-candidates.js";

const RUN_STEPS = ["submitted", "hardening_query", "planning", "retrieving", "gating", "verifying", "ready"];
const runs = new Map();

export function createInvestigationRun(payload = {}, library = {}, options = {}) {
  const casePacket = selectCase(payload.caseId, library);
  const spec = hardenInvestigationQuery({
    rawQuery: payload.rawQuery || payload.raw_query || casePacket?.title || "",
    jurisdiction: payload.jurisdiction || casePacket?.jurisdiction || "",
    targetEntity: payload.targetEntity || payload.target_entity || "",
    targetType: payload.targetType || payload.target_type || casePacket?.caseType || ""
  });
  const now = new Date().toISOString();
  const officialApiTasks = planOfficialApiTasks(spec, {
    maxTasks: payload.officialApiTaskCap ?? payload.official_api_task_cap ?? 8,
    maxResults: payload.officialApiMaxResults ?? payload.official_api_max_results ?? 5
  });
  const providerCandidateSet = collectProviderCandidates(spec, {
    maxTasks: payload.providerTaskCap ?? payload.provider_task_cap ?? 6,
    maxResults: payload.providerMaxResults ?? payload.provider_max_results ?? 5,
    candidateCap: payload.providerCandidateCap ?? payload.provider_candidate_cap ?? 8,
    providerCapUsd: payload.providerCapUsd ?? payload.provider_cap_usd ?? 0,
    enableLiveProviderCalls: payload.enableLiveProviderCalls ?? payload.enable_live_provider_calls ?? false
  });
  const run = {
    ok: true,
    mode: "fixture_backed_investigation_run",
    run_id: `local_run_${Date.now()}`,
    case_id: casePacket?.caseId || "",
    status: "submitted",
    steps: RUN_STEPS,
    current_step_index: 0,
    investigation_spec: spec,
    provider_calls_executed: false,
    official_api_calls_executed: false,
    paid_spend_incurred: false,
    remote_mutation_executed: false,
    model_findings_generated: false,
    candidate_sources_are_evidence: false,
    provider_candidate_tasks: providerCandidateSet.tasks,
    provider_candidates: providerCandidateSet.candidates,
    official_api_tasks: officialApiTasks,
    retrieval_queue: buildRetrievalQueue(spec, casePacket, officialApiTasks, providerCandidateSet.tasks),
    cost_ledger: {
      provider_cap_usd: Number(payload.providerCapUsd ?? payload.provider_cap_usd ?? 0),
      provider_mode: providerCandidateSet.provider_mode,
      provider_task_cap: providerCandidateSet.tasks.length,
      provider_candidate_cap: providerCandidateSet.candidates.length,
      official_api_task_cap: officialApiTasks.length,
      estimated_spend_usd: 0,
      actual_spend_usd: 0,
      cost_capped: false
    },
    audit_trail: [
      auditEvent("run_created", "submitted", "Raw query hardened into an InvestigationSpec; no retrieval or synthesis executed.", now),
      auditEvent("provider_candidate_router", "submitted", `${providerCandidateSet.candidates.length} provider-search candidates planned from ${providerCandidateSet.tasks.length} capped tasks; outputs are locator-only until fetched and receipted.`, now),
      auditEvent("official_api_router", "submitted", `${officialApiTasks.length} official API candidate-probe tasks planned; metadata is candidate-only until fetched and receipted.`, now),
      auditEvent("candidate_policy", "submitted", "Provider, search, and vector hits remain candidate leads until fetched, receipted, gated, and verified.", now)
    ],
    created_at: now,
    updated_at: now
  };
  saveRun(run, options.store);
  return materializeRun(run, library);
}

export function getInvestigationRun(runId, library = {}, options = {}) {
  const run = loadRun(runId, options.store);
  if (!run) {
    return { ok: false, error: "Run not found", status: 404 };
  }
  const elapsed = Math.max(0, Date.now() - Date.parse(run.created_at));
  const index = Math.min(RUN_STEPS.length - 1, Math.floor(elapsed / 650));
  const nextStatus = RUN_STEPS[index];
  const updated = {
    ...run,
    status: nextStatus,
    current_step_index: index,
    retrieval_queue: updateRetrievalQueue(run.retrieval_queue || [], nextStatus),
    audit_trail: appendStatusAudit(run.audit_trail || [], run.status, nextStatus),
    updated_at: new Date().toISOString()
  };
  saveRun(updated, options.store);
  return materializeRun(updated, library);
}

export function resetInvestigationRuns() {
  runs.clear();
}

function materializeRun(run, library) {
  const casePacket = selectCase(run.case_id, library);
  if (!casePacket) return run;
  const ready = run.status === "ready";
  return {
    ...run,
    action_brief: ready ? buildActionBriefResponse(casePacket, library) : null,
    case_board: ready ? buildCaseBoardResponse(casePacket, library) : null
  };
}

function saveRun(run, store) {
  runs.set(run.run_id, run);
  if (store?.saveRun) store.saveRun(run);
}

function loadRun(runId, store) {
  const key = String(runId || "");
  return runs.get(key) || store?.getRun?.(key) || null;
}

function buildRetrievalQueue(spec, casePacket, officialApiTasks = [], providerCandidateTasks = []) {
  const sourcePriority = Array.isArray(spec.source_priority) ? spec.source_priority : [];
  const missing = Array.isArray(casePacket?.nextRecords) ? casePacket.nextRecords.slice(0, 4) : [];
  const queue = providerCandidateTasks.map((task) => ({
    task_id: task.task_id,
    task_type: task.task_type,
    source_family: "provider_search_candidate",
    provider_id: task.provider_id,
    provider: task.provider,
    endpoint: task.endpoint,
    status: task.status,
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    receipt_required: true
  }));
  queue.push(...officialApiTasks.map((task) => ({
    task_id: task.task_id,
    task_type: task.task_type,
    source_family: task.source_family,
    official_source_id: task.source_id,
    endpoint: task.endpoint,
    status: task.status,
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    receipt_required: true
  })));
  const offset = queue.length;
  queue.push(...sourcePriority.slice(0, 6).map((source, index) => ({
    task_id: `rq_${index + 1}`,
    task_type: "source_family_probe",
    source_family: source,
    status: "queued",
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true
  })));
  for (const [index, record] of missing.entries()) {
    queue.push({
      task_id: `miss_${offset + index + 1}`,
      task_type: "missing_record_request",
      source_family: "records_request",
      target_record: record.request || "Request missing public record.",
      status: "queued",
      evidence_promotion_allowed: false,
      candidate_only_until_receipted: true
    });
  }
  return queue;
}

function updateRetrievalQueue(queue, status) {
  return queue.map((task, index) => {
    if (task.task_type === "official_api_candidate_probe" && task.status === "needs_secret") {
      return task;
    }
    if (task.task_type === "provider_candidate_search" && task.status === "cost_capped") {
      return task;
    }
    if (["submitted", "hardening_query", "planning"].includes(status)) {
      return { ...task, status: index === 0 && status === "planning" ? "planned" : task.status };
    }
    if (["retrieving", "gating", "verifying"].includes(status)) {
      return { ...task, status: index < 3 ? "candidate_collected_unverified" : task.status };
    }
    if (status === "ready") {
      return { ...task, status: task.task_type === "missing_record_request" ? "needs_records_request" : "candidate_only_unverified" };
    }
    return task;
  });
}

function appendStatusAudit(auditTrail, previousStatus, nextStatus) {
  if (previousStatus === nextStatus || auditTrail.some((event) => event.status === nextStatus && event.event === "status_transition")) {
    return auditTrail;
  }
  return [
    ...auditTrail,
    auditEvent("status_transition", nextStatus, `Run advanced from ${previousStatus || "unknown"} to ${nextStatus}.`, new Date().toISOString())
  ];
}

function auditEvent(event, status, message, at) {
  return {
    event,
    status,
    message,
    at,
    public_safe: true
  };
}

function selectCase(caseId, library = {}) {
  const cases = Array.isArray(library.cases) ? library.cases : [];
  return cases.find((item) => item.caseId === caseId)
    || cases.find((item) => item.caseId === library.defaultCaseId)
    || cases[0]
    || null;
}
