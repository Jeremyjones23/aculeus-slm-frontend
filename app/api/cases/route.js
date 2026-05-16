import { NextResponse } from "next/server";
import { listRecentCaseSeeds } from "@/lib/aculeus-product-data.js";
import { listCases, saveCase } from "@/lib/aculeus-product-store.js";
import { buildAccessDeniedPayload, canAccessWorkspace, canCreateCase, getVerifiedRequestUser } from "@/lib/access-control.js";

export async function GET(request) {
  const user = await getVerifiedRequestUser(request);
  if (!canAccessWorkspace(user)) {
    return NextResponse.json(buildAccessDeniedPayload("list_cases", user), { status: 403 });
  }
  const storedCases = await listCases();
  return NextResponse.json({
    ok: true,
    access: "invite_only_local_preview",
    cases: [...storedCases, ...listRecentCaseSeeds()]
  });
}

export async function POST(request) {
  const user = await getVerifiedRequestUser(request);
  if (!canCreateCase(user)) {
    return NextResponse.json(buildAccessDeniedPayload("create_case", user), { status: 403 });
  }
  const body = await request.json();
  const item = await saveCase({
    title: body.title,
    lead: body.lead || body.rawQuery || body.raw_query,
    jurisdiction: body.jurisdiction,
    status: body.status || "intake",
    visibility: body.visibility || "private",
    caseSpec: body.caseSpec || body.case_spec || {}
  });
  return NextResponse.json({ ok: true, case: item }, { status: 201 });
}
