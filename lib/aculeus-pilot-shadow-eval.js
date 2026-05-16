import { runShadowModelEvaluation, validateShadowEvalReport } from "./aculeus-shadow-model.js";

export function buildPilotShadowEvalReport(traces = [], options = {}) {
  const safeTraces = traces
    .map((trace) => ({
      id: trace.id || trace.trace_id,
      run_id: trace.run_id || trace.payload?.run_id,
      case_id: trace.case_id || trace.payload?.case_id,
      trace_type: trace.trace_type || trace.payload?.action,
      payload: trace.payload || trace,
      created_at: trace.created_at || trace.payload?.created_at
    }))
    .filter((trace) => trace.case_id && trace.run_id);
  if (!safeTraces.length) throw new Error("No public-safe pilot traces were available for shadow evaluation.");

  const cases = buildCasesFromTraces(safeTraces);
  const report = runShadowModelEvaluation({
    cases,
    baseline: { model_id: options.baselineModelId || "production_aculeus_trace_workflow", adjustment: 0 },
    candidate: { model_id: options.candidateModelId || "candidate_aculeus_shadow_from_pilot_traces", adjustment: 0 }
  });
  const enriched = {
    ...report,
    input_trace_count: safeTraces.length,
    input_run_count: new Set(safeTraces.map((trace) => trace.run_id)).size,
    source: {
      store: options.store || "training_traces",
      trace_limit: options.traceLimit || safeTraces.length,
      public_safe_only: true
    },
    cases: report.cases.map((row) => ({
      ...row,
      trace_count: cases.find((item) => item.case_id === row.case_id)?.trace_count || 0,
      run_count: cases.find((item) => item.case_id === row.case_id)?.run_count || 0
    }))
  };
  const issues = validateShadowEvalReport(enriched);
  if (issues.length) throw new Error(`Pilot trace shadow eval failed validation:\n${issues.join("\n")}`);
  if (enriched.user_visible_promotion_allowed !== false) throw new Error("Shadow eval attempted user-visible promotion.");
  return enriched;
}

function buildCasesFromTraces(items) {
  const byCase = new Map();
  for (const trace of items) {
    const payload = trace.payload || {};
    const current = byCase.get(trace.case_id) || {
      case_id: trace.case_id,
      expected_source_families: new Set(),
      trace_count: 0,
      run_ids: new Set()
    };
    current.trace_count += 1;
    current.run_ids.add(trace.run_id);
    for (const family of sourceFamiliesForTrace(payload)) current.expected_source_families.add(family);
    byCase.set(trace.case_id, current);
  }
  return [...byCase.values()].map((item) => ({
    case_id: item.case_id,
    expected_source_families: [...item.expected_source_families].sort(),
    trace_count: item.trace_count,
    run_count: item.run_ids.size
  }));
}

function sourceFamiliesForTrace(payload) {
  const families = new Set();
  for (const entry of payload.source_ledger || []) {
    if (entry.entry_type) families.add(entry.entry_type);
    for (const label of entry.labels || []) {
      if (/official|provider|receipt|reviewer|feedback/i.test(label)) families.add(String(label));
    }
  }
  for (const action of payload.retrieval_actions || []) {
    if (action.provider) families.add(action.provider);
    if (action.source_id) families.add(action.source_id);
    if (action.task_type) families.add(action.task_type);
  }
  if (!families.size && payload.action) families.add(payload.action);
  return families.size ? families : new Set(["pilot_trace"]);
}
