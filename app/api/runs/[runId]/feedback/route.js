import { NextResponse } from "next/server";
import { appendRunLedger, appendRunTrainingTrace, getRun } from "@/lib/aculeus-product-store.js";
import { appendTrainingTrace, buildTrainingTrace } from "@/lib/aculeus-training-trace-exporter.js";
import { buildUserFeedbackSignal, validateUserFeedbackSignal } from "@/lib/aculeus-user-feedback.js";

export async function POST(request, context) {
  try {
    const { runId } = await context.params;
    const run = await getRun(runId);
    if (!run) return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });

    const payload = await request.json();
    const signal = buildUserFeedbackSignal({
      ...payload,
      runId,
      caseId: run.caseId
    });
    const issues = validateUserFeedbackSignal(signal);
    if (issues.length) {
      return NextResponse.json({ ok: false, error: "invalid_feedback_signal", issues }, { status: 400 });
    }

    const ledgerEntry = await appendRunLedger(runId, {
      ledger_entry_id: `feedback_${signal.feedback_id}`,
      entry_type: "user_feedback",
      run_id: runId,
      case_id: run.caseId,
      status: "feedback_recorded",
      labels: ["user_product_reward", signal.feedback_type, "training_signal_unreviewed"],
      feedback: signal,
      public_safe: true
    });

    const trace = buildTrainingTrace({
      runId,
      caseId: run.caseId,
      action: "user_feedback",
      caseSpec: run.caseSpec || run.case_spec || null,
      sourceLedger: [ledgerEntry],
      findings: run.answerBrief?.support || [],
      userFeedback: signal.user_feedback,
      finalOutcome: "user_feedback_recorded_for_offline_review"
    });
    const traceRef = appendTrainingTrace(trace);
    await appendRunTrainingTrace(runId, traceRef);

    return NextResponse.json({
      ok: true,
      feedback: signal,
      ledger_entry: ledgerEntry,
      training_trace: traceRef
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
