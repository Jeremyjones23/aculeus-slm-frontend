const ALLOWED_FEEDBACK_TYPES = new Set([
  "useful",
  "not_useful",
  "opened_evidence",
  "saved_or_exported",
  "flagged_hallucination",
  "dismissed_finding"
]);

export function buildUserFeedbackSignal(input = {}) {
  const type = String(input.type || input.feedback_type || "").trim();
  const now = input.created_at || new Date().toISOString();
  return {
    feedback_id: input.feedback_id || `feedback_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    run_id: input.runId || input.run_id || null,
    case_id: input.caseId || input.case_id || null,
    feedback_type: type,
    target_id: input.targetId || input.target_id || null,
    note: String(input.note || "").slice(0, 600),
    user_feedback: {
      useful: type === "useful",
      not_useful: type === "not_useful",
      opened_evidence: type === "opened_evidence",
      saved_or_exported: type === "saved_or_exported",
      flagged_hallucination: type === "flagged_hallucination",
      dismissed: type === "dismissed_finding"
    },
    created_at: now,
    public_safe: true,
    training_conversion_allowed: false
  };
}

export function validateUserFeedbackSignal(signal = {}) {
  const issues = [];
  if (!signal.feedback_id) issues.push("feedback signal missing id");
  if (!signal.run_id) issues.push("feedback signal missing run id");
  if (!ALLOWED_FEEDBACK_TYPES.has(signal.feedback_type)) issues.push("feedback signal type is not allowed");
  if (signal.training_conversion_allowed !== false) issues.push("feedback signal must not allow automatic training conversion");
  if (signal.public_safe !== true) issues.push("feedback signal must be public safe");
  return issues;
}
