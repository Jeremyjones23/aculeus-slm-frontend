import { planCrawlerTasks } from "./aculeus-crawler-executor.js";
import { planOfficialApiTasks } from "./aculeus-official-source-router.js";
import { planProviderCandidateTasks } from "./aculeus-provider-candidates.js";

export function scoutRunGaps({ run, caseBoard, spec = {}, options = {} } = {}) {
  const ledger = Array.isArray(caseBoard?.sourceLedger) ? caseBoard.sourceLedger : Array.isArray(run?.ledger) ? run.ledger : [];
  const missingRecords = caseBoard?.missingRecords || run?.answerBrief?.missing || [];
  const candidates = caseBoard?.candidateQueue || ledger.flatMap((entry) => entry.candidates || []);
  const existingKeys = new Set([
    ...ledger.flatMap((entry) => (entry.tasks || []).map(taskKey)),
    ...candidates.map((candidate) => normalizeKey(candidate.normalized_url || candidate.url || candidate.candidate_id))
  ].filter(Boolean));

  const gapQuery = buildGapQuery(run, spec, missingRecords);
  const scoutSpec = {
    ...spec,
    raw_query: gapQuery,
    jurisdiction: spec.jurisdiction || run?.answerBrief?.title || run?.lead || "",
    suspected_issue_types: ["missing_records", "weak_evidence", "unresolved_entities"]
  };

  const planned = [
    ...planOfficialApiTasks(scoutSpec, { maxTasks: options.maxOfficialTasks || 4, maxResults: 3 }).map((task) => ({ ...task, lane: "official_api" })),
    ...planProviderCandidateTasks(scoutSpec, { maxTasks: options.maxProviderTasks || 2, maxResults: 2, providerCapUsd: 0 }).map((task) => ({ ...task, lane: "provider_search" })),
    ...planCrawlerTasks(scoutSpec, { maxTasks: options.maxCrawlerTasks || 2 }).map((task) => ({ ...task, lane: "custom_crawler" }))
  ];

  const deduped = [];
  for (const task of planned) {
    const key = taskKey(task);
    if (!key || existingKeys.has(key)) continue;
    existingKeys.add(key);
    deduped.push({
      ...task,
      scout_reason: "Second-pass gap scout task for unresolved missing records or weak candidate coverage.",
      evidence_promotion_allowed: false,
      public_safe: true
    });
  }

  return {
    status: deduped.length ? "second_pass_tasks_ready" : "no_new_tasks",
    missing_record_count: missingRecords.length,
    existing_ledger_count: ledger.length,
    duplicate_tasks_removed: planned.length - deduped.length,
    tasks: deduped,
    spend_cap_usd: 0,
    evidence_promotion_allowed: false,
    public_safe: true
  };
}

export function validateGapScoutResult(result) {
  const issues = [];
  if (!result || typeof result !== "object") return ["gap scout result must be an object"];
  if (result.spend_cap_usd !== 0) issues.push("gap scout should not spend directly");
  if (result.evidence_promotion_allowed !== false) issues.push("gap scout must not promote evidence");
  const seen = new Set();
  for (const task of result.tasks || []) {
    const key = taskKey(task);
    if (seen.has(key)) issues.push(`duplicate task: ${key}`);
    seen.add(key);
    if (task.evidence_promotion_allowed !== false) issues.push(`${task.task_id} escaped evidence gate`);
  }
  return issues;
}

function buildGapQuery(run, spec, missingRecords) {
  const missing = missingRecords.map((record) => record.request || record.holder || "").filter(Boolean).slice(0, 3).join("; ");
  return [spec.raw_query || spec.rawQuery || run?.lead || "", missing].filter(Boolean).join(" | missing records: ");
}

function taskKey(task) {
  return normalizeKey(task.endpoint || task.url || `${task.lane || task.source_family}:${task.source_id}:${task.query || ""}`);
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}
