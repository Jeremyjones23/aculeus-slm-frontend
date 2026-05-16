import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    mode: "workflow_skeleton_ready",
    note: "The durable Aculeus workflow definition exists under workflows/aculeus-case-run.js. Start it after Vercel Workflow env is linked."
  });
}
