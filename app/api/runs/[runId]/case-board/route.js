import { NextResponse } from "next/server";
import { getRun } from "@/lib/aculeus-product-store.js";
import { buildCaseBoardResponse } from "@/lib/aculeus-run-api-contracts.js";
import { buildAccessDeniedPayload, canAccessWorkspace, getVerifiedRequestUser } from "@/lib/access-control.js";

export async function GET(request, context) {
  const user = await getVerifiedRequestUser(request);
  if (!canAccessWorkspace(user)) {
    return NextResponse.json(buildAccessDeniedPayload("read_case_board", user), { status: 403 });
  }
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, caseBoard: buildCaseBoardResponse(run) });
}
