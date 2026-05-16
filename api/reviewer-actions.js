import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createFileReceiptStore } from "../lib/aculeus-receipt-store.js";
import { reviewCandidatePromotion, reviewCandidateRejection } from "../lib/aculeus-reviewer-actions.js";

const receiptStore = createFileReceiptStore(process.env.ACULEUS_RECEIPT_STORE_DIR || defaultReceiptDir());

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const payload = await readJsonRequest(request);
  const action = String(payload.action || "promote_candidate_source");
  if (action === "reject_candidate_source") {
    response.status(200).json(reviewCandidateRejection(payload));
    return;
  }

  const receipt = payload.receipt || receiptStore.getReceipt(payload.receipt_id);
  if (!receipt) {
    response.status(200).json({
      ok: true,
      action: "promote_candidate_source",
      status: "blocked",
      reason: "receipt_not_found",
      finding_promotion_allowed: false,
      high_risk_finding_blocked: true,
      evidence_record: null,
      verifier: {
        ok: false,
        issues: [{
          severity: "blocking",
          issue_type: "receipt_not_found",
          message: "Receipt must exist before reviewer promotion.",
          suggested_action: "Fetch and store the public receipt first.",
          status: "open"
        }]
      },
      public_safe: true
    });
    return;
  }

  const result = reviewCandidatePromotion({
    ...payload,
    receipt,
    receiptText: receipt.raw_text
  });
  response.status(200).json(result);
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
