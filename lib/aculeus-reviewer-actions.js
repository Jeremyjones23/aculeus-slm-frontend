import { verifyCandidateStillNotEvidence, verifyReceiptCitation } from "./aculeus-citation-verifier.js";

export function reviewCandidatePromotion(input = {}) {
  const candidate = input.candidate || {};
  const receipt = input.receipt || {};
  const reviewer = String(input.reviewer || input.reviewer_id || "local_reviewer").trim();
  const beforeGate = verifyCandidateStillNotEvidence(candidate);
  if (!beforeGate.ok) {
    return actionResult("blocked", "candidate_precheck_failed", {
      candidate,
      receipt,
      reviewer,
      verifier: { ok: false, issues: beforeGate.issues }
    });
  }

  const verifier = verifyReceiptCitation({
    candidate,
    receipt,
    receiptText: input.receiptText || input.receipt_text || receipt.raw_text || "",
    quote: input.quote || input.quoted_text,
    claim: input.claim,
    adjudicative_source: input.adjudicative_source === true
  });

  if (!verifier.source_promotion_allowed || !verifier.evidence_record) {
    return actionResult("blocked", "receipt_citation_verifier_blocked_source", {
      candidate,
      receipt,
      reviewer,
      verifier
    });
  }

  const promotedAt = input.promoted_at || new Date().toISOString();
  return {
    ok: true,
    action: "promote_candidate_source",
    status: "source_promoted_to_evidence",
    finding_promotion_allowed: verifier.finding_promotion_allowed,
    high_risk_finding_blocked: verifier.finding_promotion_allowed === false,
    evidence_record: {
      ...verifier.evidence_record,
      review: {
        reviewer,
        promoted_at: promotedAt,
        action_reason: "Receipt URL, content hash, and quoted text passed deterministic citation verification.",
        finding_promotion_allowed: verifier.finding_promotion_allowed
      }
    },
    candidate_update: {
      candidate_id: candidate.candidate_id || candidate.source_id || "",
      promotion_status: "source_promoted_after_receipt_verification",
      evidence_id: verifier.evidence_record.evidence_id
    },
    verifier,
    audit_event: auditEvent("reviewer_promoted_source", promotedAt, reviewer, candidate, receipt),
    public_safe: true
  };
}

export function reviewCandidateRejection(input = {}) {
  const candidate = input.candidate || {};
  const rejectedAt = input.rejected_at || new Date().toISOString();
  const reviewer = String(input.reviewer || input.reviewer_id || "local_reviewer").trim();
  return {
    ok: true,
    action: "reject_candidate_source",
    status: "candidate_rejected_or_deferred",
    candidate_update: {
      candidate_id: candidate.candidate_id || candidate.source_id || "",
      promotion_status: "rejected_or_deferred_by_reviewer",
      evidence_id: null
    },
    reason: String(input.reason || "Reviewer rejected or deferred this candidate pending stronger public records.").trim(),
    audit_event: {
      event: "reviewer_rejected_candidate",
      at: rejectedAt,
      reviewer,
      candidate_id: candidate.candidate_id || candidate.source_id || "",
      public_safe: true
    },
    public_safe: true
  };
}

export function reviewCandidateDeferral(input = {}) {
  const candidate = input.candidate || {};
  const deferredAt = input.deferred_at || new Date().toISOString();
  const reviewer = String(input.reviewer || input.reviewer_id || "local_reviewer").trim();
  const reason = String(input.reason || "Reviewer deferred this source pending a receipt, stronger quote, or corroborating official record.").trim();
  return reviewerDisposition("defer_candidate_source", "candidate_deferred", "reviewer_deferred_candidate", candidate, reviewer, deferredAt, reason);
}

export function reviewCandidateAnnotation(input = {}) {
  const candidate = input.candidate || {};
  const annotatedAt = input.annotated_at || new Date().toISOString();
  const reviewer = String(input.reviewer || input.reviewer_id || "local_reviewer").trim();
  const note = String(input.note || input.reason || "Reviewer annotation added for later source triage.").trim();
  return reviewerDisposition("annotate_candidate_source", "candidate_annotated", "reviewer_annotated_candidate", candidate, reviewer, annotatedAt, note);
}

export function reviewRecordRequest(input = {}) {
  const candidate = input.candidate || {};
  const requestedAt = input.requested_at || new Date().toISOString();
  const reviewer = String(input.reviewer || input.reviewer_id || "local_reviewer").trim();
  const request = String(input.request || input.reason || "Request the missing public record needed to verify this lead.").trim();
  return {
    ...reviewerDisposition("request_missing_record", "missing_record_requested", "reviewer_requested_missing_record", candidate, reviewer, requestedAt, request),
    missing_record_task: {
      task_id: `missing_record_${Date.now()}`,
      candidate_id: candidate.candidate_id || candidate.source_id || "",
      request,
      status: "needs_public_records_request",
      public_safe: true
    }
  };
}

export function validateReviewerActionResult(result) {
  const issues = [];
  if (!result || typeof result !== "object") return ["reviewer action result must be an object"];
  if (result.public_safe !== true) issues.push("reviewer action result must be public_safe");
  if (!["source_promoted_to_evidence", "blocked", "candidate_rejected_or_deferred", "candidate_deferred", "candidate_annotated", "missing_record_requested"].includes(result.status)) {
    issues.push("reviewer action result has invalid status");
  }
  if (result.status === "source_promoted_to_evidence") {
    if (!result.evidence_record?.evidence_id || !result.evidence_record?.receipt_id || !result.evidence_record?.content_hash) {
      issues.push("promoted evidence record must include id, receipt, and hash");
    }
    if (!result.evidence_record?.provenance?.quote) issues.push("promoted evidence record must retain supporting quote");
    if (result.candidate_update?.evidence_id !== result.evidence_record?.evidence_id) {
      issues.push("candidate update evidence_id must match promoted evidence record");
    }
  }
  if (result.status === "blocked" && !result.verifier?.issues?.length) {
    issues.push("blocked reviewer action must include verifier issues");
  }
  return issues;
}

function reviewerDisposition(action, status, event, candidate, reviewer, at, reason) {
  return {
    ok: true,
    action,
    status,
    candidate_update: {
      candidate_id: candidate.candidate_id || candidate.source_id || "",
      promotion_status: status,
      evidence_id: null
    },
    reason,
    audit_event: {
      event,
      at,
      reviewer,
      candidate_id: candidate.candidate_id || candidate.source_id || "",
      public_safe: true
    },
    public_safe: true
  };
}

function actionResult(status, reason, context) {
  return {
    ok: true,
    action: "promote_candidate_source",
    status,
    reason,
    finding_promotion_allowed: false,
    high_risk_finding_blocked: true,
    evidence_record: null,
    candidate_update: {
      candidate_id: context.candidate.candidate_id || context.candidate.source_id || "",
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null
    },
    verifier: context.verifier,
    audit_event: auditEvent("reviewer_promotion_blocked", new Date().toISOString(), context.reviewer, context.candidate, context.receipt),
    public_safe: true
  };
}

function auditEvent(event, at, reviewer, candidate, receipt) {
  return {
    event,
    at,
    reviewer,
    candidate_id: candidate.candidate_id || candidate.source_id || "",
    receipt_id: receipt.receipt_id || "",
    public_safe: true
  };
}
