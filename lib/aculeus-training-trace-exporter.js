import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { scoreProductionTrace } from "./aculeus-trace-scoring.js";

const runtimeWritableRoot = process.env.VERCEL || process.env.VERCEL_ENV ? "/tmp" : process.cwd();
const defaultTracePath = join(
  /*turbopackIgnore: true*/ runtimeWritableRoot,
  "data",
  "training-traces",
  "aculeus_frontend_operator_traces_20260516.jsonl"
);

export function buildTrainingTrace(input = {}) {
  const now = input.created_at || new Date().toISOString();
  const trace = sanitizeTrace({
    trace_id: input.trace_id || `trace_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    created_at: now,
    schema_version: "aculeus_frontend_operator_trace.v1",
    case_id: input.caseId || input.case_id || null,
    run_id: input.runId || input.run_id || null,
    action: input.action || "operator_event",
    case_spec: input.caseSpec || input.case_spec || null,
    model_plan: input.modelPlan || input.model_plan || null,
    retrieval_actions: input.retrievalActions || input.retrieval_actions || [],
    source_ledger: input.sourceLedger || input.source_ledger || [],
    gap_analysis: input.gapAnalysis || input.gap_analysis || null,
    findings: input.findings || [],
    verifier_results: input.verifierResults || input.verifier_results || null,
    reviewer_action: input.reviewerAction || input.reviewer_action || null,
    user_feedback: input.userFeedback || input.user_feedback || {},
    cost_latency: input.costLatency || input.cost_latency || {},
    final_outcome: input.finalOutcome || input.final_outcome || "trace_for_offline_review",
    training_conversion_allowed: false,
    direct_model_answer_used: false,
    candidate_snippets_treated_as_evidence: false,
    public_safe: true
  });
  const score = scoreProductionTrace(trace);
  return sanitizeTrace({
    ...trace,
    score_payload: score,
    trace_quality_score: score.score,
    review_status: score.review_status,
    training_conversion_allowed: false
  });
}

export function appendTrainingTrace(trace, options = {}) {
  const safe = buildTrainingTrace(trace);
  const target = options.path || process.env.ACULEUS_TRAINING_TRACE_PATH || defaultTracePath;
  mkdirSync(dirname(target), { recursive: true });
  appendFileSync(target, `${JSON.stringify(safe)}\n`, "utf8");
  return {
    trace_id: safe.trace_id,
    path: target,
    score: safe.trace_quality_score,
    review_status: safe.review_status,
    training_conversion_allowed: safe.training_conversion_allowed,
    public_safe: true
  };
}

function sanitizeTrace(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token|raw_text|rawText|request_headers|requestHeaders/i.test(key)) return undefined;
    if (typeof child === "string" && child.length > 2400) return `${child.slice(0, 2400)}...`;
    return child;
  }));
}
