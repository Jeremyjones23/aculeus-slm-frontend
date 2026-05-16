import { createServer } from "node:http";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileReceiptStore } from "../lib/aculeus-receipt-store.js";
import { fetchPublicReceipt } from "../lib/aculeus-receipt-fetcher.js";
import { verifyCandidateStillNotEvidence, verifyReceiptCitation } from "../lib/aculeus-citation-verifier.js";

const failures = [];
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-receipt-store-"));
const store = createFileReceiptStore(storeDir);
const body = "Official audit receipt. Contract A-123 approved $123,456 for public services. This page does not adjudicate fraud or intent.";
const server = createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
});

function listen() {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function close() {
  return new Promise((resolve) => server.close(resolve));
}

try {
  await listen();
  process.env.ACULEUS_ALLOW_LOCAL_RECEIPT_TESTS = "1";
  const port = server.address().port;
  const candidate = {
    candidate_id: "candidate_receipt_fixture",
    url: `http://127.0.0.1:${port}/receipt.txt`,
    title: "Official audit receipt fixture",
    source_family: "official_page_or_pdf",
    promotion_status: "candidate_lead_not_evidence",
    evidence_id: null
  };

  const candidateGate = verifyCandidateStillNotEvidence(candidate);
  if (!candidateGate.ok) failures.push("candidate gate rejected a proper candidate-only lead");

  const receipt = await fetchPublicReceipt({ sourceId: candidate.candidate_id, url: candidate.url }, { store, maxBytes: 32000 });
  if (!receipt.receipt_id || !receipt.content_sha256 || receipt.raw_text) failures.push("public receipt missing hash/id or leaked raw_text");
  if (!existsSync(join(storeDir, `${receipt.receipt_id}.json`))) failures.push("receipt was not persisted");

  const stored = store.getReceipt(receipt.receipt_id);
  const verified = verifyReceiptCitation({
    candidate,
    receipt: stored,
    receiptText: stored.raw_text,
    quote: "Contract A-123 approved $123,456 for public services.",
    claim: "Records show Contract A-123 approved $123,456 for public services."
  });
  if (!verified.source_promotion_allowed) failures.push("receipt-backed source should be promotable to evidence record");
  if (!verified.finding_promotion_allowed) failures.push("non-high-risk receipt-backed finding should pass");
  if (!verified.evidence_record?.content_hash || verified.evidence_record?.receipt_id !== receipt.receipt_id) failures.push("evidence record missing receipt/hash");

  const highRisk = verifyReceiptCitation({
    candidate,
    receipt: stored,
    receiptText: stored.raw_text,
    quote: "Contract A-123 approved $123,456 for public services.",
    claim: "Fraud occurred in Contract A-123."
  });
  if (!highRisk.source_promotion_allowed) failures.push("high-risk claim should still allow source-level receipt promotion");
  if (highRisk.finding_promotion_allowed) failures.push("high-risk claim was improperly promoted as a finding");
  if (!highRisk.issues.some((issue) => issue.issue_type === "high_risk_claim_requires_adjudicative_source")) failures.push("high-risk verifier issue missing");

  const missingQuote = verifyReceiptCitation({
    candidate,
    receipt: stored,
    receiptText: stored.raw_text,
    quote: "This text is not in the receipt.",
    claim: "Records show unsupported text."
  });
  if (missingQuote.source_promotion_allowed || missingQuote.finding_promotion_allowed) failures.push("missing quote should block source and finding promotion");

  const badCandidate = verifyCandidateStillNotEvidence({ ...candidate, evidence_id: "ev_bad" });
  if (badCandidate.ok) failures.push("candidate with evidence_id should be blocked before receipt verification");
} finally {
  await close();
  rmSync(storeDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`Receipt/citation verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Receipt/citation verification passed.");
