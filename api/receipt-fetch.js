import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createFileReceiptStore } from "../lib/aculeus-receipt-store.js";
import { fetchPublicReceipt } from "../lib/aculeus-receipt-fetcher.js";
import { verifyReceiptCitation } from "../lib/aculeus-citation-verifier.js";
import { appendRunLedger, getRun } from "../lib/aculeus-product-store.js";

const receiptStore = createFileReceiptStore(process.env.ACULEUS_RECEIPT_STORE_DIR || defaultReceiptDir());

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const payload = await readJsonRequest(request);
  const candidate = payload.candidate || {
    candidate_id: payload.candidate_id || payload.source_id,
    url: payload.url,
    title: payload.title,
    source_family: payload.source_family,
    promotion_status: "candidate_lead_not_evidence",
    evidence_id: null
  };
  const receipt = await fetchPublicReceipt({
    sourceId: candidate.candidate_id || candidate.source_id,
    url: candidate.url || payload.url,
    max_bytes: payload.max_bytes
  }, { store: receiptStore, maxBytes: payload.max_bytes });
  const stored = receiptStore.getReceipt(receipt.receipt_id);
  const quote = payload.quote || payload.quoted_text;
  const verifier = verifyReceiptCitation({
    candidate,
    receipt: stored,
    receiptText: stored?.raw_text,
    quote,
    claim: payload.claim,
    adjudicative_source: payload.adjudicative_source === true
  });
  const run = payload.runId ? await getRun(payload.runId) : null;
  const quote_sha256 = quote ? createHash("sha256").update(String(quote)).digest("hex") : null;
  const ledgerEntry = {
    ledger_entry_id: `receipt_fetch_${Date.now()}`,
    entry_type: "receipt_fetch",
    run_id: run?.runId || payload.runId || null,
    case_id: run?.caseId || payload.caseId || null,
    status: verifier.source_promotion_allowed ? "receipt_citation_ready" : "receipt_fetched_verifier_blocked",
    labels: ["fetched", "receipt", verifier.source_promotion_allowed ? "usable_as_evidence" : "candidate_only"],
    candidate_id: candidate.candidate_id || candidate.source_id || null,
    receipt,
    quote_sha256,
    verifier,
    public_safe: true
  };
  if (run?.runId) await appendRunLedger(run.runId, ledgerEntry);

  response.status(200).json({
    ok: true,
    mode: "receipt_fetch_and_citation_verify",
    runId: run?.runId || payload.runId || null,
    receipt,
    quote_sha256,
    verifier,
    ledger_entry: ledgerEntry
  });
}

function defaultReceiptDir() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) return join("/tmp", "aculeus", "receipts");
  return fileURLToPath(new URL("../.local/receipts", import.meta.url));
}

function readJsonRequest(request) {
  if (request.body && typeof request.body === "object") return request.body;
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}
