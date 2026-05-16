import { NextResponse } from "next/server";
import { answerFollowUp } from "@/lib/aculeus-run-adapter.js";

export async function POST(request) {
  const body = await request.json();
  const answer = await answerFollowUp(body);
  return NextResponse.json({ ok: true, answer });
}
