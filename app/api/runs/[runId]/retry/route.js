import { NextResponse } from "next/server";
import { appendRunLedger, getRun, saveRun } from "@/lib/aculeus-product-store.js";

export async function POST(request, context) {
  const { runId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });
  }

  const taskType = body.taskType || body.task_type || "retrieval_task";
  const taskId = body.taskId || body.task_id || `${taskType}_retry`;
  const now = new Date().toISOString();
  const nextRun = {
    ...run,
    status: "retrieving",
    lifecycle: {
      ...(run.lifecycle || {}),
      state: "retrieving",
      terminal: false,
      updatedAt: now,
      pollAfterMs: 450,
      taskSummary: {
        ...(run.lifecycle?.taskSummary || {}),
        [taskType]: "retrying"
      },
      checkpoints: [
        ...(run.lifecycle?.checkpoints || []),
        {
          state: "retrieving",
          label: "Retry queued",
          detail: `Retry queued for ${taskType}. Partial ledger rows remain visible.`,
          at: now
        }
      ]
    },
    updatedAt: now
  };
  await saveRun(nextRun);
  const ledgerEntry = await appendRunLedger(runId, {
    ledger_entry_id: `retry_${Date.now()}`,
    entry_type: "task_retry",
    run_id: runId,
    case_id: run.caseId,
    status: "retry_queued",
    labels: ["retry", "partial_result_recovery", "failed_fetch_visible"],
    task_id: taskId,
    task_type: taskType,
    failed_source_visible: true,
    evidence_promotion_allowed: false,
    public_safe: true,
    created_at: now
  });

  return NextResponse.json({ ok: true, run: await getRun(runId), ledger_entry: ledgerEntry });
}
