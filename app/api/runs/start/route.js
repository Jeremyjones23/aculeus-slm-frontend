import { NextResponse } from "next/server";
import { createAculeusRun } from "@/lib/aculeus-run-adapter.js";
import { saveRun } from "@/lib/aculeus-product-store.js";
import { initializeRunLifecycle } from "@/lib/aculeus-run-lifecycle.js";
import { buildAccessDeniedPayload, canCreateCase, getRequestUser } from "@/lib/access-control.js";

export async function POST(request) {
  const user = getRequestUser(request);
  if (!canCreateCase(user)) {
    return NextResponse.json(buildAccessDeniedPayload("create_case", user), { status: 403 });
  }
  const body = await request.json();
  const run = initializeRunLifecycle(await createAculeusRun(body));
  await saveRun(run);
  return NextResponse.json({ ok: true, run });
}
