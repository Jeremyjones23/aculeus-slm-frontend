import { NextResponse } from "next/server";
import { createAculeusRun } from "@/lib/aculeus-run-adapter.js";
import { getCase, saveRun } from "@/lib/aculeus-product-store.js";
import { initializeRunLifecycle } from "@/lib/aculeus-run-lifecycle.js";
import { buildAccessDeniedPayload, canCreateCase, getRequestUser } from "@/lib/access-control.js";

export async function POST(request, context) {
  const user = getRequestUser(request);
  if (!canCreateCase(user)) {
    return NextResponse.json(buildAccessDeniedPayload("create_case_run", user), { status: 403 });
  }
  const { caseId } = await context.params;
  const body = await request.json();
  const caseRecord = await getCase(caseId);
  const run = initializeRunLifecycle(await createAculeusRun({
    ...body,
    caseId,
    caseRecord,
    lead: body.lead || body.rawQuery || body.raw_query || caseRecord?.lead
  }));
  await saveRun(run);
  return NextResponse.json({ ok: true, run }, { status: 201 });
}
