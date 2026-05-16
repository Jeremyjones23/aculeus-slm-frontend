export function buildAdminRunSummary(store = {}) {
  const runs = Array.isArray(store.runs) ? store.runs : [];
  const rows = runs.map((run) => {
    const providerCost = providerCostForRun(run);
    return {
      run_id: run.runId,
      case_id: run.caseId,
      workspace_id: run.workspace_id || run.workspaceId || "workspace_default",
      status: run.status || run.lifecycle?.state || "unknown",
      ledger_count: Array.isArray(run.ledger) ? run.ledger.length : 0,
      failure_count: Array.isArray(run.ledger) ? run.ledger.filter((entry) => /failed|blocked/i.test(String(entry.status))).length : 0,
      export_count: countExports(run),
      estimated_spend_usd: sumSpend([run]),
      provider_estimated_spend_usd: providerCost.estimated_spend_usd,
      provider_cap_usd: providerCost.provider_cap_usd,
      provider_call_count: providerCost.provider_call_count,
      provider_spend_alert: providerCost.alert,
      updated_at: run.updatedAt || run.updated_at || null
    };
  });
  const providerCostSummary = buildProviderCostSummary(rows);
  return {
    schema_version: "aculeus_admin_run_summary.v1",
    run_count: runs.length,
    failure_count: runs.filter(hasFailure).length,
    export_count: runs.reduce((sum, run) => sum + countExports(run), 0),
    estimated_spend_usd: sumSpend(runs),
    provider_cost_summary: providerCostSummary,
    rows,
    public_safe: true
  };
}

export function buildTrainingTraceReviewQueue(store = {}, options = {}) {
  const runs = Array.isArray(store.runs) ? store.runs : [];
  const limit = Math.max(1, Math.min(Number(options.limit || 30), 120));
  const traces = [];
  for (const run of runs) {
    for (const trace of Array.isArray(run.trainingTraces) ? run.trainingTraces : []) {
      traces.push(traceReviewRow(run, trace));
    }
  }
  traces.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
  const rows = traces.slice(0, limit);
  const approved = rows.filter((row) => row.training_conversion_allowed).length;
  const rejected = rows.filter((row) => row.review_status === "rejected_for_training").length;
  const pending = rows.filter((row) => !row.reviewed).length;
  return {
    schema_version: "aculeus_training_trace_review_queue.v1",
    trace_count: rows.length,
    pending_count: pending,
    approved_count: approved,
    rejected_count: rejected,
    exportable_count: approved,
    rows,
    public_safe: true,
    direct_model_promotion_allowed: false
  };
}

export function buildTrainingExportDataset(store = {}, options = {}) {
  const format = normalizeExportFormat(options.format);
  const queue = buildTrainingTraceReviewQueue(store, { limit: options.limit || 500 });
  const rows = queue.rows
    .filter((row) => row.training_conversion_allowed === true)
    .map((row) => format === "preference" ? preferenceRow(row) : sftRow(row));
  return {
    schema_version: `aculeus_${format}_training_export.v1`,
    format,
    row_count: rows.length,
    rows,
    public_safe: true,
    production_update_allowed: false,
    hosted_training_allowed: false,
    direct_model_promotion_allowed: false
  };
}

export function validateAdminRunSummary(summary = {}) {
  const issues = [];
  if (summary.schema_version !== "aculeus_admin_run_summary.v1") issues.push("admin summary schema mismatch");
  if (!Number.isFinite(summary.run_count)) issues.push("admin summary missing run count");
  if (!Array.isArray(summary.rows)) issues.push("admin summary rows missing");
  for (const row of summary.rows || []) {
    if (!row.run_id || !row.case_id || !row.workspace_id) issues.push("admin row missing identifiers");
    if (!Number.isFinite(row.ledger_count) || !Number.isFinite(row.failure_count)) issues.push(`${row.run_id}: admin row counts invalid`);
    if (!Number.isFinite(row.provider_estimated_spend_usd || 0)) issues.push(`${row.run_id}: provider spend invalid`);
    if (!["ok", "provider_spend_near_cap", "provider_spend_over_cap"].includes(row.provider_spend_alert || "ok")) issues.push(`${row.run_id}: provider spend alert invalid`);
  }
  if (!summary.provider_cost_summary || !Number.isFinite(summary.provider_cost_summary.estimated_spend_usd)) issues.push("admin summary missing provider cost summary");
  if (JSON.stringify(summary).match(/api[_-]?key|authorization|secret|raw_text/i)) issues.push("admin summary leaked blocked material");
  return issues;
}

export function validateTrainingTraceReviewQueue(queue = {}) {
  const issues = [];
  if (queue.schema_version !== "aculeus_training_trace_review_queue.v1") issues.push("trace review queue schema mismatch");
  if (!Array.isArray(queue.rows)) issues.push("trace review queue rows missing");
  if (queue.direct_model_promotion_allowed !== false) issues.push("trace queue allowed direct model promotion");
  for (const row of queue.rows || []) {
    if (!row.trace_id || !row.run_id || !row.case_id) issues.push("trace review row missing identifiers");
    if (row.training_conversion_allowed && row.review_status !== "approved_for_sft_preference_pool") issues.push(`${row.trace_id}: exportable trace has wrong review status`);
    if (row.source_ledger_count < 0 || row.retrieval_action_count < 0) issues.push(`${row.trace_id}: invalid trace counts`);
  }
  if (JSON.stringify(queue).match(/api[_-]?key|authorization|secret|raw_text/i)) issues.push("trace review queue leaked blocked material");
  return issues;
}

export function validateTrainingExportDataset(dataset = {}) {
  const issues = [];
  if (!["aculeus_sft_training_export.v1", "aculeus_preference_training_export.v1"].includes(dataset.schema_version)) issues.push("training export schema mismatch");
  if (!Array.isArray(dataset.rows)) issues.push("training export rows missing");
  if (dataset.production_update_allowed !== false || dataset.hosted_training_allowed !== false) issues.push("training export bypassed offline promotion gate");
  for (const row of dataset.rows || []) {
    if (!row.trace_id || !row.run_id || !row.case_id) issues.push("training export row missing identifiers");
    if (row.training_conversion_allowed !== true) issues.push(`${row.trace_id}: unapproved trace entered export`);
  }
  if (JSON.stringify(dataset).match(/api[_-]?key|authorization|secret|raw_text/i)) issues.push("training export leaked blocked material");
  return issues;
}

function hasFailure(run) {
  return Array.isArray(run.ledger) && run.ledger.some((entry) => /failed|blocked/i.test(String(entry.status)));
}

function countExports(run) {
  return Array.isArray(run.exports) ? run.exports.length : Array.isArray(run.exportPackets) ? run.exportPackets.length : 0;
}

function sumSpend(runs) {
  const total = runs.reduce((sum, run) => sum + (Array.isArray(run.ledger) ? run.ledger.reduce((ledgerSum, entry) => {
    return ledgerSum + extractSpend(entry);
  }, 0) : 0), 0);
  return Number(total.toFixed(4));
}

function providerCostForRun(run = {}) {
  const ledger = Array.isArray(run.ledger) ? run.ledger : [];
  const providerEntries = ledger.filter((entry) => {
    const labels = Array.isArray(entry.labels) ? entry.labels : [];
    return entry.entry_type === "provider_search" || labels.includes("provider") || entry.result_summary?.provider_calls_executed === true;
  });
  const estimatedSpend = providerEntries.reduce((sum, entry) => sum + extractSpend(entry), 0);
  const capUsd = providerEntries.reduce((sum, entry) => sum + extractCap(entry), 0);
  const providerCallCount = providerEntries.filter((entry) => entry.result_summary?.provider_calls_executed || entry.result_summary?.paid_spend_incurred).length;
  const alert = providerSpendAlert(estimatedSpend, capUsd);
  return {
    estimated_spend_usd: roundMoney(estimatedSpend),
    provider_cap_usd: roundMoney(capUsd),
    provider_call_count: providerCallCount,
    alert
  };
}

function buildProviderCostSummary(rows = []) {
  const estimatedSpend = rows.reduce((sum, row) => sum + Number(row.provider_estimated_spend_usd || 0), 0);
  const capUsd = rows.reduce((sum, row) => sum + Number(row.provider_cap_usd || 0), 0);
  const providerCallCount = rows.reduce((sum, row) => sum + Number(row.provider_call_count || 0), 0);
  const alerts = rows
    .filter((row) => row.provider_spend_alert && row.provider_spend_alert !== "ok")
    .map((row) => ({
      run_id: row.run_id,
      case_id: row.case_id,
      alert: row.provider_spend_alert,
      estimated_spend_usd: row.provider_estimated_spend_usd,
      provider_cap_usd: row.provider_cap_usd
    }));
  return {
    estimated_spend_usd: roundMoney(estimatedSpend),
    provider_cap_usd: roundMoney(capUsd),
    remaining_cap_usd: roundMoney(Math.max(0, capUsd - estimatedSpend)),
    provider_call_count: providerCallCount,
    alert_count: alerts.length,
    alerts
  };
}

function providerSpendAlert(estimatedSpend, capUsd) {
  if (!Number.isFinite(capUsd) || capUsd <= 0) return "ok";
  if (estimatedSpend > capUsd) return "provider_spend_over_cap";
  if (estimatedSpend / capUsd >= 0.8) return "provider_spend_near_cap";
  return "ok";
}

function extractSpend(entry = {}) {
  const spend = Number(
    entry.actual_spend_usd
    ?? entry.result?.actual_spend_usd
    ?? entry.result?.estimated_spend_usd
    ?? entry.result_summary?.actual_spend_usd
    ?? entry.result_summary?.estimated_spend_usd
    ?? 0
  );
  return Number.isFinite(spend) ? spend : 0;
}

function extractCap(entry = {}) {
  const cap = Number(entry.provider_cap_usd ?? entry.result?.provider_cap_usd ?? entry.result_summary?.provider_cap_usd ?? 0);
  return Number.isFinite(cap) ? cap : 0;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(4));
}

function traceReviewRow(run = {}, trace = {}) {
  const score = trace.score_payload || {};
  const sourceLedger = Array.isArray(trace.source_ledger) ? trace.source_ledger : [];
  const retrievalActions = Array.isArray(trace.retrieval_actions) ? trace.retrieval_actions : [];
  const verifier = trace.verifier_results || {};
  const reviewed = trace.reviewed === true;
  const trainingAllowed = trace.training_conversion_allowed === true;
  return sanitizeAdminObject({
    trace_id: trace.trace_id || trace.id,
    run_id: trace.run_id || run.runId,
    case_id: trace.case_id || run.caseId,
    action: trace.action || trace.trace_type || "operator_event",
    created_at: trace.created_at || run.createdAt || null,
    reviewed,
    reviewed_at: trace.reviewed_at || null,
    reviewed_by: trace.reviewed_by || null,
    review_status: trace.review_status || "needs_human_review_before_training",
    review_decision: trace.review_decision || null,
    review_note: trace.review_note || "",
    trace_quality_score: Number(trace.trace_quality_score ?? score.score ?? 0),
    source_ledger_count: sourceLedger.length,
    retrieval_action_count: retrievalActions.length,
    verifier_issue_count: Array.isArray(verifier.issues) ? verifier.issues.length : 0,
    training_conversion_allowed: trainingAllowed,
    sft_preference_pool_eligible: trainingAllowed,
    direct_model_answer_used: trace.direct_model_answer_used === true,
    candidate_snippets_treated_as_evidence: trace.candidate_snippets_treated_as_evidence === true,
    user_visible_promotion_allowed: false,
    direct_model_promotion_allowed: false,
    safety_gates: {
      public_safe: trace.public_safe !== false,
      no_direct_model_answer: trace.direct_model_answer_used !== true,
      no_candidate_snippet_evidence: trace.candidate_snippets_treated_as_evidence !== true,
      reviewed_before_training: trainingAllowed ? reviewed : false
    },
    source_families: summarizeSourceFamilies(sourceLedger),
    final_outcome: trace.final_outcome || "trace_for_offline_review"
  });
}

function sftRow(row) {
  return {
    trace_id: row.trace_id,
    run_id: row.run_id,
    case_id: row.case_id,
    task: row.action,
    target_behavior: "source_fed_public_records_investigation",
    input_summary: `Run ${row.run_id} / case ${row.case_id}`,
    output_summary: row.final_outcome,
    reviewer_gate: row.review_status,
    trace_quality_score: row.trace_quality_score,
    training_conversion_allowed: true,
    direct_model_promotion_allowed: false
  };
}

function preferenceRow(row) {
  return {
    trace_id: row.trace_id,
    run_id: row.run_id,
    case_id: row.case_id,
    prompt: `Prefer source-fed trace behavior for ${row.action}.`,
    chosen: "Grounded plan or finding with official-source priority, citation checks, gap disclosure, and no overclaim.",
    rejected: "Broad unsupported synthesis, snippet-as-evidence, or uncited fraud/intent claim.",
    reviewer_gate: row.review_status,
    training_conversion_allowed: true,
    direct_model_promotion_allowed: false
  };
}

function summarizeSourceFamilies(sourceLedger = []) {
  const counts = {};
  for (const entry of sourceLedger) {
    const key = entry.source_family || entry.entry_type || "unknown_source_family";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function normalizeExportFormat(format) {
  return String(format || "sft").toLowerCase() === "preference" ? "preference" : "sft";
}

function sanitizeAdminObject(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token|raw_text|rawText|request_headers/i.test(key)) return undefined;
    return child;
  }));
}
