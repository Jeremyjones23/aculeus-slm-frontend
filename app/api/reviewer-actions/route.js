import { NextResponse } from "next/server";
import { join } from "node:path";
import { createFileReceiptStore } from "@/lib/aculeus-receipt-store.js";
import {
  reviewCandidateAnnotation,
  reviewCandidateDeferral,
  reviewCandidatePromotion,
  reviewCandidateRejection,
  reviewRecordRequest
} from "@/lib/aculeus-reviewer-actions.js";
import { getRun, appendRunLedger, appendRunTrainingTrace } from "@/lib/aculeus-product-store.js";
import { appendTrainingTrace, buildTrainingTrace } from "@/lib/aculeus-training-trace-exporter.js";

function receiptStore() {
  return createFileReceiptStore(process.env.ACULEUS_RECEIPT_STORE_DIR || join(process.cwd(), ".local", "receipts"));
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const action = String(payload.action || "promote_candidate_source");
    const run = payload.runId ? await getRun(payload.runId) : null;
    let result;
    if (action === "reject_candidate_source") {
      result = reviewCandidateRejection(payload);
    } else if (action === "defer_candidate_source") {
      result = reviewCandidateDeferral(payload);
    } else if (action === "annotate_candidate_source") {
      result = reviewCandidateAnnotation(payload);
    } else if (action === "request_missing_record") {
      result = reviewRecordRequest(payload);
    } else {
      const store = receiptStore();
      const receipt = payload.receipt || store.getReceipt(payload.receipt_id);
      if (!receipt) {
        result = blockedReceiptNotFound(payload);
      } else {
        result = reviewCandidatePromotion({
          ...payload,
          receipt,
          receiptText: receipt.raw_text
        });
      }
    }

    const ledgerEntry = {
      ledger_entry_id: `reviewer_action_${Date.now()}`,
      entry_type: "reviewer_action",
      run_id: run?.runId || payload.runId || null,
      case_id: run?.caseId || payload.caseId || null,
      status: result.status,
      labels: ["reviewer", result.status === "source_promoted_to_evidence" ? "usable_as_evidence" : "candidate_only", result.missing_record_task ? "needs_public_records_request" : null].filter(Boolean),
      result,
      public_safe: true
    };
    if (run?.runId) await appendRunLedger(run.runId, ledgerEntry);

    const trace = buildTrainingTrace({
      runId: run?.runId,
      caseId: run?.caseId || payload.caseId,
      action: "reviewer_action",
      reviewerAction: result,
      verifierResults: result.verifier || null,
      sourceLedger: result.evidence_record ? [result.evidence_record] : [],
      finalOutcome: result.status
    });
    const traceRef = run?.runId
      ? await appendRunTrainingTrace(run.runId, trace)
      : appendTrainingTrace(trace);

    return NextResponse.json({ ...result, runId: run?.runId || payload.runId || null, ledger_entry: ledgerEntry, training_trace: traceRef });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

function blockedReceiptNotFound(payload) {
  return {
    ok: true,
    action: "promote_candidate_source",
    status: "blocked",
    reason: "receipt_not_found",
    finding_promotion_allowed: false,
    high_risk_finding_blocked: true,
    evidence_record: null,
    candidate_update: {
      candidate_id: payload.candidate?.candidate_id || payload.candidate?.source_id || "",
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null
    },
    verifier: {
      ok: false,
      issues: [{
        severity: "blocking",
        issue_type: "receipt_not_found",
        message: "Receipt must exist before reviewer promotion.",
        suggested_action: "Fetch and store the public receipt first.",
        status: "open"
      }]
    },
    public_safe: true
  };
}
