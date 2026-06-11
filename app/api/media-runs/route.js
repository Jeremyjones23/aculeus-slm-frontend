import { NextResponse } from "next/server";
import { buildReadSnapshot } from "@/lib/aculeus-read-snapshot.js";
import { startMediaRun } from "@/lib/aculeus-media-run.js";
import { saveMediaRunAuto, getMediaRunAuto } from "@/lib/aculeus-media-run-store.js";
import { buildAccessDeniedPayload, canCreateCase, getVerifiedRequestUser } from "@/lib/access-control.js";
import { hasDatabase, query } from "@/lib/database.js";

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
  // Verify the source run actually exists before spending any model calls; a bogus id would
  // otherwise run the full pipeline and only fail at persistence on the runs FK.
  if (hasDatabase() && snapshot.source_run_id) {
    const rows = await query("select 1 from runs where id = $1 limit 1", [snapshot.source_run_id]);
    if (!rows.length) {
      return NextResponse.json({ ok: false, reason: "source_run_not_found" }, { status: 422 });
    }
  }
  const result = await startMediaRun({
    snapshot,
    profiles: Array.isArray(body.profiles) ? body.profiles : [],
    formats: Array.isArray(body.formats) && body.formats.length ? body.formats : ["op_ed"],
    spendCapCents: Number(body.spendCapCents) || 0,
    escalateModelId: body.escalateModelId
  });
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  // Rendering already succeeded; a persistence failure (e.g. a missing source run FK) must
  // not surface as a 500. Report it as persisted:false so the client can handle it.
  let persisted = true;
  try {
    await saveMediaRunAuto(result.media_run, snapshot);
  } catch (error) {
    persisted = false;
    console.error("media_run persistence failed", error);
  }
  return NextResponse.json({ ok: true, media_run: result.media_run, persisted });
}

// GET /api/media-runs?id=... — read a saved media run.
export async function GET(request) {
  const user = await getVerifiedRequestUser(request);
  if (!canCreateCase(user)) {
    return NextResponse.json(buildAccessDeniedPayload("read_media_run", user), { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  const media_run = id ? await getMediaRunAuto(id) : null;
  return NextResponse.json({ ok: Boolean(media_run), media_run });
}
