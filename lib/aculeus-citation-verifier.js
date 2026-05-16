const HIGH_RISK_TERMS = /\b(fraud|fraudulent|intent|illegal|illegality|misconduct|waste|abuse|corruption|bribe|kickback)\b/i;

export function verifyReceiptCitation(input = {}) {
  const candidate = input.candidate || {};
  const receipt = input.receipt || {};
  const quote = String(input.quote || input.quoted_text || "").trim();
  const claim = String(input.claim || "").trim();
  const receiptText = String(input.receiptText || input.receipt_text || receipt.raw_text || receipt.excerpt || "");
  const issues = [];

  if (!candidate.candidate_id && !candidate.source_id) issues.push(blocking("missing_candidate_id", "Candidate/source ID is required."));
  if (!candidate.url) issues.push(blocking("missing_candidate_url", "Candidate URL is required."));
  if (!receipt.receipt_id) issues.push(blocking("missing_receipt_id", "Receipt ID is required."));
  if (!receipt.content_sha256) issues.push(blocking("missing_content_hash", "Receipt content hash is required."));
  if (candidate.url && receipt.url && normalizeUrl(candidate.url) !== normalizeUrl(receipt.url)) {
    issues.push(blocking("url_mismatch", "Candidate URL and receipt URL do not match."));
  }
  if (!quote) {
    issues.push(blocking("missing_quote", "A quoted excerpt is required before source promotion."));
  } else if (!containsNormalized(receiptText, quote)) {
    issues.push(blocking("quote_not_found", "Quoted text was not found in the fetched receipt."));
  }
  if (HIGH_RISK_TERMS.test(claim) && input.adjudicative_source !== true) {
    issues.push(blocking("high_risk_claim_requires_adjudicative_source", "Fraud, intent, illegality, misconduct, waste, or abuse claims require direct adjudicative or official audit support and human review."));
  }

  const sourcePromotionAllowed = !issues.some((issue) => issue.severity === "blocking" && issue.issue_type !== "high_risk_claim_requires_adjudicative_source");
  const findingPromotionAllowed = sourcePromotionAllowed && !issues.some((issue) => issue.severity === "blocking");
  return {
    ok: true,
    verifier: "aculeus_receipt_citation_verifier",
    source_promotion_allowed: sourcePromotionAllowed,
    finding_promotion_allowed: findingPromotionAllowed,
    evidence_record: sourcePromotionAllowed ? evidenceRecordFrom(candidate, receipt, quote) : null,
    issues
  };
}

export function verifyCandidateStillNotEvidence(candidate) {
  const issues = [];
  if (candidate?.evidence_id !== null && candidate?.evidence_id !== undefined) {
    issues.push(blocking("candidate_has_evidence_id", "Candidate lead must not carry an evidence_id before receipt verification."));
  }
  if (candidate?.promotion_status && candidate.promotion_status !== "candidate_lead_not_evidence") {
    issues.push(blocking("candidate_promotion_status_invalid", "Candidate promotion status must remain candidate_lead_not_evidence before receipt verification."));
  }
  return {
    ok: issues.length === 0,
    issues
  };
}

function evidenceRecordFrom(candidate, receipt, quote) {
  const sourceId = String(candidate.candidate_id || candidate.source_id || receipt.source_id || "");
  return {
    evidence_id: `ev_${sourceId}`,
    source_id: sourceId,
    receipt_id: receipt.receipt_id,
    url: receipt.url,
    title: candidate.title || receipt.url,
    publisher: candidate.publisher || candidate.source_family || "public_record_source",
    source_type: candidate.source_family || "public_record",
    fetched_at: receipt.fetched_at,
    content_hash: receipt.content_sha256,
    provenance: {
      quote,
      content_type: receipt.content_type || "",
      status_code: receipt.status_code || null
    },
    public_safe: true
  };
}

function blocking(issueType, message) {
  return {
    severity: "blocking",
    issue_type: issueType,
    message,
    suggested_action: "Fetch the correct public record, quote exact supporting text, downgrade the claim, or request the missing record.",
    status: "open"
  };
}

function normalizeUrl(value) {
  const parsed = new URL(String(value || ""));
  parsed.hash = "";
  return parsed.toString();
}

function containsNormalized(haystack, needle) {
  return compact(haystack).toLowerCase().includes(compact(needle).toLowerCase());
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
