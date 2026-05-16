import { fileURLToPath } from "node:url";
import { createFileReceiptStore } from "../lib/aculeus-receipt-store.js";
import { fetchPublicReceipt } from "../lib/aculeus-receipt-fetcher.js";
import { verifyReceiptCitation } from "../lib/aculeus-citation-verifier.js";

const receiptStore = createFileReceiptStore(process.env.ACULEUS_RECEIPT_STORE_DIR || fileURLToPath(new URL("../.local/receipts", import.meta.url)));

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
  const verifier = verifyReceiptCitation({
    candidate,
    receipt: stored,
    receiptText: stored?.raw_text,
    quote: payload.quote || payload.quoted_text,
    claim: payload.claim,
    adjudicative_source: payload.adjudicative_source === true
  });

  response.status(200).json({
    ok: true,
    mode: "receipt_fetch_and_citation_verify",
    receipt,
    verifier
  });
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
