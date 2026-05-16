import { NextResponse } from "next/server";
import { browserCaptureLedgerEntry, capturePublicPageWithBrowserbase } from "@/lib/aculeus-browserbase-capture.js";
import { buildAccessDeniedPayload, canReviewEvidence, getVerifiedRequestUser } from "@/lib/access-control.js";
import { appendRunLedger, getRun } from "@/lib/aculeus-product-store.js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const user = await getVerifiedRequestUser(request);
    if (!canReviewEvidence(user)) {
      return NextResponse.json(buildAccessDeniedPayload("browser_capture", user), { status: 403 });
    }
    const body = await request.json();
    const candidate = body.candidate || {
      candidate_id: body.candidate_id || body.source_id,
      source_id: body.source_id,
      url: body.url,
      title: body.title
    };
    const run = body.runId ? await getRun(body.runId) : null;
    const capture = await capturePublicPageWithBrowserbase({
      run_id: run?.runId || body.runId || null,
      case_id: run?.caseId || body.caseId || null,
      candidate_id: candidate.candidate_id || candidate.source_id || body.candidate_id || body.source_id,
      source_id: candidate.source_id || body.source_id || candidate.candidate_id,
      url: candidate.url || body.url,
      title: candidate.title || body.title
    });
    const ledgerEntry = browserCaptureLedgerEntry(capture, {
      run_id: run?.runId || body.runId || null,
      case_id: run?.caseId || body.caseId || null,
      candidate_id: candidate.candidate_id || candidate.source_id || body.candidate_id || body.source_id
    });
    if (run?.runId) await appendRunLedger(run.runId, ledgerEntry);
    return NextResponse.json({
      ok: true,
      mode: "browserbase_capture",
      runId: run?.runId || body.runId || null,
      capture,
      ledger_entry: ledgerEntry,
      evidence_promotion_allowed: false
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
