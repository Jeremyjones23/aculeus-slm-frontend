import { buildReviewerExportPacket } from "./aculeus-export-packets.js";

export function buildCaseBoardResponse(run) {
  const ledger = Array.isArray(run.ledger) ? run.ledger : [];
  const candidates = ledger.flatMap((entry) => Array.isArray(entry.candidates) ? entry.candidates : []);
  const verifierIssues = ledger.flatMap((entry) => Array.isArray(entry.validation_issues)
    ? entry.validation_issues
    : entry.verifier?.issues || []);
  const reviewerActions = ledger.filter((entry) => entry.entry_type === "reviewer_action");
  const failedSources = ledger.filter((entry) => entry.status === "failed_fetch" || entry.labels?.includes("failed_fetch_visible"));
  const evidenceRecords = reviewerActions
    .map((entry) => entry.result?.evidence_record)
    .filter(Boolean);

  return {
    runId: run.runId,
    caseId: run.caseId,
    status: run.status || "review",
    caseHeader: {
      title: run.answerBrief?.title || run.lead || "Aculeus case",
      lead: run.lead || "",
      createdAt: run.createdAt,
      updatedAt: run.updatedAt
    },
    findingsTable: run.answerBrief?.support || [],
    evidenceRail: evidenceRecords,
    candidateQueue: candidates,
    missingRecords: run.answerBrief?.missing || [],
    rejectedOrWeakClaims: ledger.filter((entry) => ["blocked", "rejected", "needs_operator_review"].includes(entry.status)),
    verifierIssues,
    failedSources,
    sourceLedger: ledger,
    auditTrail: ledger.map((entry) => ({
      id: entry.ledger_entry_id,
      type: entry.entry_type,
      status: entry.status,
      labels: entry.labels || [],
      created_at: entry.created_at
    })),
    invariants: {
      direct_model_answer_ui: false,
      candidates_are_evidence: false,
      promotion_requires_receipt_and_verifier: true
    }
  };
}

export function buildExportPacket(run) {
  const packet = buildReviewerExportPacket(run, { visibility: "public" });
  return {
    exportId: packet.export_id,
    runId: packet.run_id,
    caseId: packet.case_id,
    exportTypes: packet.formats,
    status: "created",
    publicSafe: true,
    createdAt: packet.generated_at,
    schemaVersion: packet.schema_version,
    payload: {
      caseHeader: packet.case_header,
      findingsTable: packet.findings,
      evidenceRail: packet.evidence_records,
      receiptRefs: packet.receipt_refs,
      sourceLedger: packet.source_ledger,
      missingRecords: packet.missing_records,
      rejectedOrWeakClaims: packet.rejected_or_weak_claims,
      verifierStatus: packet.verifier_status,
      limitations: packet.limitations,
      packet
    }
  };
}
