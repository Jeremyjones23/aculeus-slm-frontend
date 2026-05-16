import { NextResponse } from "next/server";
import { getRun } from "@/lib/aculeus-product-store.js";
import { buildCaseBoardResponse } from "@/lib/aculeus-run-api-contracts.js";

export async function GET(_request, context) {
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, caseBoard: buildCaseBoardResponse(run) });
}
