import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createSmokeAuthHeaders } from "./smoke-auth-headers.mjs";

const base = (process.argv[2] || process.env.ACULEUS_PREVIEW_URL || process.env.ACULEUS_DEPLOY_URL || "").replace(/\/+$/, "");
if (!base) {
  throw new Error("Usage: node scripts/postdeploy-receipt-smoke.mjs <deploy-url> or set ACULEUS_PREVIEW_URL");
}

const receiptUrl = process.env.ACULEUS_RECEIPT_SMOKE_URL || "https://raw.githubusercontent.com/Jeremyjones23/calds-runtime/main/README.md";
const quote = process.env.ACULEUS_RECEIPT_SMOKE_QUOTE || "CalDS (California Doge Services) is a California-first, evidence-first oversight workflow prototype.";
const claim = process.env.ACULEUS_RECEIPT_SMOKE_CLAIM || "Fraud occurred because this public record mentions oversight workflow.";
const headers = createSmokeAuthHeaders({
  userId: process.env.ACULEUS_SMOKE_USER_ID || "receipt_smoke_operator",
  email: process.env.ACULEUS_SMOKE_EMAIL || "operator@aculeus.local",
  role: process.env.ACULEUS_SMOKE_ROLE || "operator"
});

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text.slice(0, 800) };
  }
}

const runStart = await fetch(`${base}/api/runs/start`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    lead: "Post-deploy receipt smoke",
    userId: headers["x-clerk-user-id"],
    caseRecord: {
      caseId: `postdeploy_receipt_smoke_${Date.now()}`,
      title: "Post-deploy receipt smoke",
      lead: "Verify receipt fetch, quote hash, citation verifier, and candidate-only evidence gate.",
      jurisdiction: "Public web"
    }
  })
});
const runJson = await readJson(runStart);
if (!runJson?.ok || !runJson?.run?.runId) throw new Error(`Run start failed: ${JSON.stringify(runJson)}`);
const runId = runJson.run.runId;

const receiptResponse = await fetch(`${base}/api/receipt-fetch`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    runId,
    candidate: {
      candidate_id: "receipt_smoke_candidate",
      source_id: "receipt_smoke_candidate",
      url: receiptUrl,
      title: "Receipt smoke public record",
      source_family: "public_page",
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null,
      evidence_promotion_allowed: false,
      receipt_required: true
    },
    quote,
    claim,
    max_bytes: 80000
  })
});
const receiptJson = await readJson(receiptResponse);
if (!receiptJson?.ok) throw new Error(`Receipt fetch failed: ${JSON.stringify(receiptJson)}`);

const boardResponse = await fetch(`${base}/api/runs/${encodeURIComponent(runId)}/case-board`, { headers });
const boardJson = await readJson(boardResponse);
if (!boardJson?.ok) throw new Error(`Case board failed: ${JSON.stringify(boardJson)}`);
const caseBoard = boardJson.caseBoard || {};
const promoted = (caseBoard.evidenceRail || []).filter((entry) => entry?.evidence_promotion_allowed === true || entry?.usable_as_evidence === true);
const expectedQuoteHash = createHash("sha256").update(quote).digest("hex");

const checks = {
  receiptStatus: receiptResponse.status,
  hasReceiptId: Boolean(receiptJson.receipt?.receipt_id),
  hasContentHash: Boolean(receiptJson.receipt?.content_sha256),
  rawTextHidden: receiptJson.receipt?.raw_text === undefined,
  quoteHashMatches: receiptJson.quote_sha256 === expectedQuoteHash,
  sourcePromotionAllowed: receiptJson.verifier?.source_promotion_allowed === true,
  findingPromotionBlocked: receiptJson.verifier?.finding_promotion_allowed === false,
  highRiskIssuePresent: (receiptJson.verifier?.issues || []).some((issue) => issue.issue_type === "high_risk_claim_requires_adjudicative_source"),
  ledgerHasReceipt: (caseBoard.sourceLedger || []).some((entry) => entry.entry_type === "receipt_fetch"),
  promotedEvidenceCount: promoted.length
};

const failures = Object.entries(checks)
  .filter(([key, value]) => {
    if (key === "receiptStatus") return value !== 200;
    if (key === "promotedEvidenceCount") return value !== 0;
    return value !== true;
  })
  .map(([key]) => key);
if (failures.length) throw new Error(`Receipt smoke failed checks: ${failures.join(", ")} ${JSON.stringify(checks)}`);

const packet = {
  ok: true,
  base,
  runId,
  receiptUrl,
  quote_sha256: receiptJson.quote_sha256,
  receipt_id: receiptJson.receipt.receipt_id,
  receipt_content_sha256: receiptJson.receipt.content_sha256,
  checks
};

const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `postdeploy-receipt-smoke-${Date.now()}.json`);
writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...packet, artifactPath: outPath }, null, 2));
