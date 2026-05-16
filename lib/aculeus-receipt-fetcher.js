import { createHash } from "node:crypto";

const DEFAULT_MAX_BYTES = 180000;

export async function fetchPublicReceipt(input = {}, options = {}) {
  const url = String(input.url || "").trim();
  const sourceId = safeId(input.source_id || input.sourceId || "source");
  const maxBytes = Math.max(1024, Math.min(Number(options.maxBytes || input.max_bytes || DEFAULT_MAX_BYTES), DEFAULT_MAX_BYTES));
  assertPublicHttpUrl(url);

  const fetchedAt = new Date().toISOString();
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "accept": "text/plain,text/html,application/json,application/pdf;q=0.7,*/*;q=0.5",
      "user-agent": "Aculeus local receipt verifier (public records review; contact operator)"
    }
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const capped = bytes.length > maxBytes;
  const limited = capped ? bytes.slice(0, maxBytes) : bytes;
  const body = new TextDecoder("utf-8", { fatal: false }).decode(limited);
  const contentHash = sha256(limited);
  const receipt = {
    receipt_id: `rcpt_${sourceId}_${contentHash.slice(0, 16)}`,
    source_id: sourceId,
    url,
    final_url: response.url,
    status_code: response.status,
    ok: response.ok,
    fetched_at: fetchedAt,
    content_type: response.headers.get("content-type") || "",
    content_length: bytes.length,
    stored_bytes: limited.length,
    capped,
    content_sha256: contentHash,
    excerpt: compact(body).slice(0, 1200),
    raw_text: body,
    public_safe: true,
    evidence_promotion_allowed: false,
    finding_promotion_allowed: false,
    citation_verifier_required: true
  };
  options.store?.saveReceipt?.(receipt);
  return publicReceipt(receipt);
}

export function publicReceipt(receipt) {
  const { raw_text: _rawText, ...publicFields } = receipt || {};
  return publicFields;
}

export function receiptText(receipt) {
  return String(receipt?.raw_text || receipt?.excerpt || "");
}

function assertPublicHttpUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Receipt URL must be a valid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Receipt URL must use http or https");
  }
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(parsed.hostname) && process.env.ACULEUS_ALLOW_LOCAL_RECEIPT_TESTS !== "1") {
    throw new Error("Localhost receipt fetches are allowed only in explicit tests");
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeId(value) {
  return String(value || "source").replace(/[^a-zA-Z0-9_.:-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "source";
}
