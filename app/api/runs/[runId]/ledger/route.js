import { NextResponse } from "next/server";
import { getRun } from "@/lib/aculeus-product-store.js";
import { buildAccessDeniedPayload, canAccessWorkspace, getRequestUser } from "@/lib/access-control.js";

export async function GET(request, context) {
  const user = getRequestUser(request);
  if (!canAccessWorkspace(user)) {
    return NextResponse.json(buildAccessDeniedPayload("read_ledger", user), { status: 403 });
  }
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    runId,
    ledger: Array.isArray(run.ledger) ? run.ledger : [],
    trainingTraces: Array.isArray(run.trainingTraces) ? run.trainingTraces : []
  });
}
