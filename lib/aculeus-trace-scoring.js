export function scoreProductionTrace(trace = {}) {
  const components = {
    search_planning_reward: scoreSearchPlanning(trace),
    evidence_reward: scoreEvidence(trace),
    finding_reward: scoreFindings(trace),
    user_product_reward: scoreUserFeedback(trace),
    cost_latency_reward: scoreCostLatency(trace)
  };
  const penalties = collectPenalties(trace);
  const rawScore = Object.values(components).reduce((sum, value) => sum + value, 0) - penalties.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    schema_version: "aculeus_trace_score.v1",
    score,
    components,
    penalties,
    reviewed: false,
    review_status: "needs_human_review_before_training",
    recommended_use: score >= 70 && penalties.length === 0 ? "candidate_sft_or_preference_trace_after_review" : "hold_for_eval_or_repair",
    training_conversion_allowed: false,
    promotion_gate: {
      requires_human_review: true,
      requires_verifier_pass: true,
      requires_no_secret_leakage: true,
      requires_no_candidate_as_evidence: true
    }
  };
}

export function validateTraceScore(trace = {}) {
  const issues = [];
  const score = trace.score_payload || trace.trace_score || {};
  if (score.schema_version !== "aculeus_trace_score.v1") issues.push("trace score schema version missing");
  if (!Number.isFinite(score.score) || score.score < 0 || score.score > 100) issues.push("trace score must be 0-100");
  if (score.reviewed !== false) issues.push("new trace score must be unreviewed");
  if (score.training_conversion_allowed !== false || trace.training_conversion_allowed !== false) {
    issues.push("trace scoring must not allow automatic training conversion");
  }
  if (!score.promotion_gate?.requires_human_review) issues.push("trace score missing human-review gate");
  if (trace.direct_model_answer_used !== false) issues.push("direct model answer flag must remain false");
  if (trace.candidate_snippets_treated_as_evidence !== false) issues.push("candidate snippets must not be treated as evidence");
  return issues;
}

function scoreSearchPlanning(trace) {
  let score = 0;
  if (trace.case_spec && typeof trace.case_spec === "object") score += 10;
  if (Array.isArray(trace.retrieval_actions) && trace.retrieval_actions.length > 0) score += 10;
  if (JSON.stringify(trace.retrieval_actions || []).match(/official|api|public|records|crawler|provider/i)) score += 5;
  if (trace.gap_analysis) score += 5;
  return score;
}

function scoreEvidence(trace) {
  const ledger = Array.isArray(trace.source_ledger) ? trace.source_ledger : [];
  let score = 0;
  if (ledger.length > 0) score += 10;
  if (ledger.some((entry) => /official|public|api|receipt|usable_as_evidence/i.test(JSON.stringify(entry)))) score += 10;
  if (ledger.every((entry) => entry.public_safe !== false)) score += 5;
  if (ledger.some((entry) => /content_hash|receipt_id|evidence_id/i.test(JSON.stringify(entry)))) score += 5;
  return score;
}

function scoreFindings(trace) {
  const findings = Array.isArray(trace.findings) ? trace.findings : [];
  if (!findings.length) return 10;
  let score = 0;
  if (findings.every((finding) => Array.isArray(finding.evidence_ids) && finding.evidence_ids.length > 0)) score += 15;
  if (findings.every((finding) => finding.claim || finding.title || finding.summary)) score += 5;
  if (findings.every((finding) => finding.confidence || finding.status)) score += 5;
  return score;
}

function scoreUserFeedback(trace) {
  const feedback = trace.user_feedback || {};
  let score = 5;
  if (feedback.useful === true) score += 6;
  if (feedback.opened_evidence === true) score += 3;
  if (feedback.saved_or_exported === true) score += 3;
  if (feedback.dismissed === true) score -= 5;
  if (feedback.flagged_hallucination === true) score -= 15;
  return Math.max(0, score);
}

function scoreCostLatency(trace) {
  const cost = trace.cost_latency || {};
  let score = 10;
  const spend = Number(cost.actual_spend_usd || cost.estimated_spend_usd || 0);
  const cap = Number(cost.provider_cap_usd || cost.cap_usd || 0);
  if (cap > 0 && spend > cap) score -= 15;
  if (spend === 0) score += 3;
  if (Number(cost.latency_ms || 0) > 60000) score -= 3;
  return Math.max(0, score);
}

function collectPenalties(trace) {
  const penalties = [];
  if (trace.direct_model_answer_used !== false) penalties.push({ reason: "direct_model_answer_used", points: 40 });
  if (trace.candidate_snippets_treated_as_evidence !== false) penalties.push({ reason: "candidate_snippets_treated_as_evidence", points: 40 });
  if (trace.verifier_results?.issues?.some((issue) => issue.severity === "blocking")) {
    penalties.push({ reason: "blocking_verifier_issue", points: 25 });
  }
  if (trace.user_feedback?.flagged_hallucination === true) penalties.push({ reason: "user_flagged_hallucination", points: 50 });
  return penalties;
}
