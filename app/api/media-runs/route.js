import { NextResponse } from "next/server";
import { buildReadSnapshot } from "@/lib/aculeus-read-snapshot.js";
import { startMediaRun } from "@/lib/aculeus-media-run.js";
import { saveMediaRun, getMediaRun } from "@/lib/aculeus-media-run-store.js";
import { buildAccessDeniedPayload, canCreateCase, getVerifiedRequestUser } from "@/lib/access-control.js";

// POST /api/media-runs — freeze an approved Read and render it for the requested
// temperaments x formats. The gateway token is read from env by the pass modules, so
// no per-request secret is handled here.
export async function POST(request) {
  const user = await getVerifiedRequestUser(request);
  if (!canCreateCase(user)) {
    return NextResponse.json(buildAccessDeniedPayload("create_media_run", user), { status: 403 });
  }
  const body = await request.json();
  const snapshot = buildReadSnapshot(body.read || {}, body.snapshotVersion || 1);
  const result = await startMediaRun({
    snapshot,
    profiles: Array.isArray(body.profiles) ? body.profiles : [],
    formats: Array.isArray(body.formats) && body.formats.length ? body.formats : ["op_ed"],
    spendCapCents: Number(body.spendCapCents) || 0,
    escalateModelId: body.escalateModelId
  });
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  saveMediaRun(result.media_run);
  return NextResponse.json({ ok: true, media_run: result.media_run });
}

// GET /api/media-runs?id=... — read a saved media run.
export async function GET(request) {
  const user = await getVerifiedRequestUser(request);
  if (!canCreateCase(user)) {
    return NextResponse.json(buildAccessDeniedPayload("read_media_run", user), { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  const media_run = id ? getMediaRun(id) : null;
  return NextResponse.json({ ok: Boolean(media_run), media_run });
}
