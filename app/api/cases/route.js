import { NextResponse } from "next/server";
import { listRecentCaseSeeds } from "@/lib/aculeus-product-data.js";
import { listCases, saveCase } from "@/lib/aculeus-product-store.js";

export async function GET() {
  const storedCases = await listCases();
  return NextResponse.json({
    ok: true,
    access: "invite_only_local_preview",
    cases: [...storedCases, ...listRecentCaseSeeds()]
  });
}

export async function POST(request) {
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
