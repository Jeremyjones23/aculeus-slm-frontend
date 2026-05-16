import { createHash } from "node:crypto";

export async function storeArtifact(input = {}, options = {}) {
  const bytes = input.bytes || new Uint8Array();
  const fileName = sanitizeFileName(input.fileName || input.file_name || "artifact.bin");
  const visibility = input.visibility || "private";
  const contentType = input.contentType || input.content_type || "application/octet-stream";
  const hash = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const token = options.token ?? process.env.BLOB_READ_WRITE_TOKEN;
  const blobClient = options.blobClient || null;
  const pathname = `aculeus/${visibility}/${Date.now()}-${fileName}`;

  if (token && blobClient?.put) {
    const blob = await blobClient.put(pathname, bytes, {
      access: visibility === "public" ? "public" : "private",
      contentType
    });
    return {
      artifact_id: `artifact_${hash.slice(0, 16)}`,
      storage_mode: "vercel_blob",
      blob_url: blob.url,
      pathname,
      file_name: fileName,
      size: bytes.length,
      content_type: contentType,
      visibility,
      content_hash: `sha256:${hash}`,
      public_safe: visibility === "public"
    };
  }

  return {
    artifact_id: `artifact_${hash.slice(0, 16)}`,
    storage_mode: "metadata_only_local_fallback",
    blob_url: null,
    pathname,
    file_name: fileName,
    size: bytes.length,
    content_type: contentType,
    visibility,
    content_hash: `sha256:${hash}`,
    note: "Blob storage is not configured or the Blob client is unavailable; artifact bytes were not uploaded.",
    public_safe: visibility === "public"
  };
}

export function validateArtifactRef(ref = {}) {
  const issues = [];
  if (!ref.artifact_id || !ref.file_name || !ref.content_hash) issues.push("artifact ref missing identifiers");
  if (!["vercel_blob", "metadata_only_local_fallback"].includes(ref.storage_mode)) issues.push("artifact ref has invalid storage mode");
  if (ref.storage_mode === "vercel_blob" && !ref.blob_url) issues.push("blob artifact missing url");
  if (ref.storage_mode === "metadata_only_local_fallback" && ref.blob_url) issues.push("local fallback must not include blob url");
  if (JSON.stringify(ref).match(/BLOB_READ_WRITE_TOKEN|secret|authorization|api[_-]?key/i)) issues.push("artifact ref leaked secret text");
  return issues;
}

function sanitizeFileName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140) || "artifact.bin";
}
