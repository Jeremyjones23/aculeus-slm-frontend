import { NextResponse } from "next/server";
import { appendRunLedger, getRun, saveRun } from "@/lib/aculeus-product-store.js";

export async function POST(request, context) {
  const { runId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const nextRun = {
    ...run,
    status: "cancelled",
    lifecycle: {
      ...(run.lifecycle || {}),
      state: "cancelled",
      terminal: true,
      updatedAt: now,
      cancellationReason: body.reason || "operator_cancelled"
    },
    updatedAt: now
  };
  await saveRun(nextRun);
  const ledgerEntry = await appendRunLedger(runId, {
    ledger_entry_id: `cancel_${Date.now()}`,
    entry_type: "run_cancelled",
    run_id: runId,
    case_id: run.caseId,
    status: "cancelled",
    labels: ["cancelled", "operator_action", "partial_result_recovery"],
    reason: body.reason || "operator_cancelled",
    partial_results_preserved: true,
    public_safe: true,
    created_at: now
  });

  return NextResponse.json({ ok: true, run: await getRun(runId), ledger_entry: ledgerEntry });
}
