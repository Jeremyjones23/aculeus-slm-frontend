import { NextResponse } from "next/server";
import { buildTrainingExportDataset, validateTrainingExportDataset } from "@/lib/aculeus-admin-console.js";
import { canReviewEvidence, getVerifiedRequestUser } from "@/lib/access-control.js";
import { getProductRepository } from "@/lib/aculeus-product-store.js";

export async function GET(request) {
  const user = await getVerifiedRequestUser(request);
  if (!canReviewEvidence(user)) {
    return NextResponse.json({ ok: false, error: "training_export_denied" }, { status: 403 });
  }
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "sft";
  const limit = Number(url.searchParams.get("limit") || 500);
  const store = await getProductRepository().readStore();
  const dataset = buildTrainingExportDataset(store, { format, limit });
  const issues = validateTrainingExportDataset(dataset);
  if (issues.length) return NextResponse.json({ ok: false, error: "training_export_invalid", issues }, { status: 500 });
  const body = dataset.rows.map((row) => JSON.stringify(row)).join("\n") + (dataset.rows.length ? "\n" : "");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="aculeus-reviewed-${dataset.format}-training-export.jsonl"`,
      "x-aculeus-row-count": String(dataset.row_count),
      "x-aculeus-production-update-allowed": "false"
    }
  });
}
