import { NextResponse } from "next/server";
import { buildAdminRunSummary } from "@/lib/aculeus-admin-console.js";
import { canReviewEvidence, getRequestUser } from "@/lib/access-control.js";
import { getProductRepository } from "@/lib/aculeus-product-store.js";

export async function GET(request) {
  const user = getRequestUser(request);
  if (!canReviewEvidence(user)) {
    return NextResponse.json({ ok: false, error: "admin_access_denied" }, { status: 403 });
  }
  const store = await getProductRepository().readStore();
  return NextResponse.json({
    ok: true,
    admin: buildAdminRunSummary(store)
  });
}
