import { NextResponse } from "next/server";
import { getRun, saveRun } from "@/lib/aculeus-product-store.js";
import { advanceRunLifecycle } from "@/lib/aculeus-run-lifecycle.js";
import { buildAccessDeniedPayload, canAccessWorkspace, getVerifiedRequestUser } from "@/lib/access-control.js";

export async function GET(request, context) {
  const user = await getVerifiedRequestUser(request);
  if (!canAccessWorkspace(user)) {
    return NextResponse.json(buildAccessDeniedPayload("read_run", user), { status: 403 });
  }
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });
  }
  const advanced = advanceRunLifecycle(run);
  if (advanced.status !== run.status || advanced.lifecycle?.state !== run.lifecycle?.state) {
    await saveRun(advanced);
  }
  return NextResponse.json({ ok: true, run: advanced });
}
