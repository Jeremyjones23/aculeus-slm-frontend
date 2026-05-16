import { storeArtifact, validateArtifactRef } from "../lib/aculeus-blob-artifacts.js";

const bytes = new TextEncoder().encode("public-safe artifact fixture");
const fallback = await storeArtifact({
  bytes,
  fileName: "fixture receipt.pdf",
  contentType: "application/pdf",
  visibility: "private"
}, { token: "", blobClient: null });

let issues = validateArtifactRef(fallback);
if (issues.length) throw new Error(`Fallback artifact failed:\n${issues.join("\n")}`);
if (fallback.storage_mode !== "metadata_only_local_fallback") throw new Error("missing-token artifact should use local fallback");
if (fallback.blob_url !== null) throw new Error("fallback artifact must not include blob url");

const uploaded = await storeArtifact({
  bytes,
  fileName: "public-export.html",
  contentType: "text/html",
  visibility: "public"
}, {
  token: "test-token",
  blobClient: {
    async put(pathname, body, options) {
      if (!pathname.includes("public-export.html")) throw new Error("blob pathname missing filename");
      if (body.length !== bytes.length) throw new Error("blob upload body length mismatch");
      if (options.access !== "public") throw new Error("public artifact should use public access");
      return { url: `https://blob.example/${pathname}` };
    }
  }
});

issues = validateArtifactRef(uploaded);
if (issues.length) throw new Error(`Blob artifact failed:\n${issues.join("\n")}`);
if (uploaded.storage_mode !== "vercel_blob" || !uploaded.blob_url) throw new Error("blob artifact did not record blob storage mode");
if (JSON.stringify([fallback, uploaded]).match(/test-token|BLOB_READ_WRITE_TOKEN|authorization/i)) throw new Error("artifact refs leaked token text");

console.log("Blob artifact verification passed.");
