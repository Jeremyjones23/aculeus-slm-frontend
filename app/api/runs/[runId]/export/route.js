import { NextResponse } from "next/server";
import { getRun } from "@/lib/aculeus-product-store.js";
import { buildExportPacket } from "@/lib/aculeus-run-api-contracts.js";
import {
  buildReviewerExportPacket,
  renderReviewerExportHtml,
  renderReviewerExportPdf
} from "@/lib/aculeus-export-packets.js";
import { buildAccessDeniedPayload, canReviewEvidence, getVerifiedRequestUser } from "@/lib/access-control.js";

export async function GET(request, context) {
  const user = await getVerifiedRequestUser(request);
  if (!canReviewEvidence(user)) {
    return NextResponse.json(buildAccessDeniedPayload("export_run", user), { status: 403 });
  }
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ ok: false, error: "run_not_found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const format = String(url.searchParams.get("format") || "json").toLowerCase();
  const visibility = url.searchParams.get("visibility") === "private" ? "private" : "public";
  const packet = buildReviewerExportPacket(run, { visibility });

  if (format === "html") {
    return new Response(renderReviewerExportHtml(packet), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${packet.export_id}.html"`
      }
    });
  }

  if (format === "pdf") {
    return new Response(renderReviewerExportPdf(packet), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${packet.export_id}.pdf"`
      }
    });
  }

  return NextResponse.json({ ok: true, export: buildExportPacket(run), packet });
}
