import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { storeArtifact } from "@/lib/aculeus-blob-artifacts.js";
import { buildAccessDeniedPayload, canCreateCase, getRequestUser } from "@/lib/access-control.js";

export async function POST(request) {
  const user = getRequestUser(request);
  if (!canCreateCase(user)) {
    return NextResponse.json(buildAccessDeniedPayload("upload_source", user), { status: 403 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const visibility = String(form.get("visibility") || "private");

  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "A source file is required." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const artifact = await storeArtifact({
    bytes,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    visibility
  }, {
    blobClient: process.env.BLOB_READ_WRITE_TOKEN ? { put } : null
  });

  return NextResponse.json({
    ok: true,
    source: {
      sourceId: `source_${Date.now()}`,
      fileName: file.name,
      size: file.size,
      visibility,
      artifact,
      citationStatus: "extraction_pending",
      note: artifact.storage_mode === "vercel_blob"
        ? "Artifact stored in Vercel Blob; citation extraction remains gated."
        : "Artifact metadata captured locally; configure production artifact storage before launch."
    }
  });
}
