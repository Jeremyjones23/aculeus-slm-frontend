import { NextResponse } from "next/server";
import { canReviewEvidence, getRequestUser } from "@/lib/access-control.js";
import { buildPilotShadowEvalReport } from "@/lib/aculeus-pilot-shadow-eval.js";
import { hasDatabase, query } from "@/lib/database.js";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!canReviewEvidence(user)) {
      return NextResponse.json({ ok: false, error: "shadow_eval_access_denied" }, { status: 403 });
    }
    if (!hasDatabase()) {
      return NextResponse.json({ ok: false, error: "database_required_for_shadow_eval" }, { status: 503 });
    }
    const url = new URL(request.url);
    const limit = clamp(Number(url.searchParams.get("limit") || 60), 1, 250);
    const rows = await query(
      `select id, run_id, case_id, trace_type, payload, public_safe, created_at
       from training_traces
       where public_safe = true
       order by created_at desc
       limit $1`,
      [limit]
    );
    const report = buildPilotShadowEvalReport(rows, {
      candidateModelId: process.env.ACULEUS_MODEL_ID || "candidate_aculeus_shadow_from_pilot_traces",
      traceLimit: limit,
      store: "neon_training_traces"
    });
    return NextResponse.json({
      ok: true,
      report,
      user_visible_promotion_allowed: false
    }, {
      headers: {
        "content-disposition": "attachment; filename=\"aculeus-pilot-shadow-eval-report.json\""
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
