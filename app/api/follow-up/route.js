import { NextResponse } from "next/server";
import { answerFollowUp } from "@/lib/aculeus-run-adapter.js";
import { buildAccessDeniedPayload, canAccessWorkspace, getRequestUser } from "@/lib/access-control.js";

export async function POST(request) {
  const user = getRequestUser(request);
  if (!canAccessWorkspace(user)) {
    return NextResponse.json(buildAccessDeniedPayload("ask_follow_up", user), { status: 403 });
  }
  const body = await request.json();
  const answer = await answerFollowUp(body);
  return NextResponse.json({ ok: true, answer });
}
