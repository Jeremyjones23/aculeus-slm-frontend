import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createFileReceiptStore } from "@/lib/aculeus-receipt-store.js";
import { fetchPublicReceipt } from "@/lib/aculeus-receipt-fetcher.js";
import { verifyReceiptCitation } from "@/lib/aculeus-citation-verifier.js";
import { getRun, appendRunLedger } from "@/lib/aculeus-product-store.js";
import { buildAccessDeniedPayload, canReviewEvidence, getVerifiedRequestUser } from "@/lib/access-control.js";
import { browserFallbackLedgerEntry } from "@/lib/aculeus-browser-capture-fallback.js";

function receiptStore() {
  const defaultDir = process.env.VERCEL || process.env.VERCEL_ENV
    ? join("/tmp", "aculeus", "receipts")
    : join(process.cwd(), ".local", "receipts");
  return createFileReceiptStore(process.env.ACULEUS_RECEIPT_STORE_DIR || defaultDir);
}

export async function POST(request) {
  let payload = null;
  let candidate = null;
  let run = null;
  try {
    const user = await getVerifiedRequestUser(request);
    if (!canReviewEvidence(user)) {
      return NextResponse.json(buildAccessDeniedPayload("fetch_receipt", user), { status: 403 });
    }
    payload = await request.json();
    candidate = payload.candidate || {
      candidate_id: payload.candidate_id || payload.source_id,
      source_id: payload.source_id,
      url: payload.url,
      title: payload.title,
      source_family: payload.source_family,
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null,
      evidence_promotion_allowed: false,
      receipt_required: true
    };
    const store = receiptStore();
    const receipt = await fetchPublicReceipt({
      sourceId: candidate.candidate_id || candidate.source_id,
      url: candidate.url || payload.url,
      max_bytes: payload.max_bytes
    }, { store, maxBytes: payload.max_bytes });
    const stored = store.getReceipt(receipt.receipt_id);
    const quote = payload.quote || payload.quoted_text || candidate.snippet;
    const verifier = verifyReceiptCitation({
      candidate,
      receipt: stored,
      receiptText: stored?.raw_text,
      quote,
      claim: payload.claim,
      adjudicative_source: payload.adjudicative_source === true
    });
    const quote_sha256 = quote ? createHash("sha256").update(String(quote)).digest("hex") : null;
    run = payload.runId ? await getRun(payload.runId) : null;
    const ledgerEntry = {
      ledger_entry_id: `receipt_fetch_${Date.now()}`,
      entry_type: "receipt_fetch",
      run_id: run?.runId || payload.runId || null,
      case_id: run?.caseId || payload.caseId || null,
      status: verifier.source_promotion_allowed ? "receipt_citation_ready" : "receipt_fetched_verifier_blocked",
      labels: ["fetched", "receipt", verifier.source_promotion_allowed ? "usable_as_evidence" : "candidate_only"],
      candidate_id: candidate.candidate_id || candidate.source_id || null,
      receipt,
      quote_sha256,
      verifier,
      public_safe: true
    };
    if (run?.runId) await appendRunLedger(run.runId, ledgerEntry);
    return NextResponse.json({
      ok: true,
      mode: "receipt_fetch_and_citation_verify",
      runId: run?.runId || payload.runId || null,
      receipt,
      quote_sha256,
      verifier,
      ledger_entry: ledgerEntry
    });
  } catch (error) {
    if (payload?.url || candidate?.url) {
      const fallbackEntry = browserFallbackLedgerEntry({
        run_id: run?.runId || payload?.runId || null,
        case_id: run?.caseId || payload?.caseId || null,
        source_id: candidate?.source_id || payload?.source_id || candidate?.candidate_id,
        candidate_id: candidate?.candidate_id || payload?.candidate_id || payload?.source_id || null,
        url: candidate?.url || payload?.url,
        title: candidate?.title || payload?.title || "Receipt fetch fallback",
        reason: error.message
      });
      if (run?.runId) await appendRunLedger(run.runId, fallbackEntry);
      return NextResponse.json({
        ok: true,
        mode: "receipt_fetch_needs_browser",
        runId: run?.runId || payload?.runId || null,
        receipt: null,
        verifier: {
          source_promotion_allowed: false,
          finding_promotion_allowed: false,
          issues: [{ issue_type: "receipt_fetch_needs_browser", severity: "blocking", message: error.message }]
        },
        ledger_entry: fallbackEntry
      }, { status: 200 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
