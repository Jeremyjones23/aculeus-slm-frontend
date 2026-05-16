import { NextResponse } from "next/server";
import { canReviewEvidence, getRequestUser } from "@/lib/access-control.js";
import { reviewTrainingTrace } from "@/lib/aculeus-product-store.js";

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    if (!canReviewEvidence(user)) {
      return NextResponse.json({ ok: false, error: "trace_review_denied" }, { status: 403 });
    }
    const { traceId } = await context.params;
    const body = await request.json();
    const trace = await reviewTrainingTrace(traceId, {
      ...body,
      reviewed_by: user.id || user.email || "approved_reviewer"
    });
    return NextResponse.json({
      ok: true,
      trace,
      training_conversion_allowed: trace.training_conversion_allowed === true,
      user_visible_promotion_allowed: false
    });
  } catch (error) {
    const status = /not found/i.test(error.message) ? 404 : 500;
    return NextResponse.json({ ok: false, error: error.message }, { status });
  }
}
