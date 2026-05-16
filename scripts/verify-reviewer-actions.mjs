import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createFileReceiptStore } from "../lib/aculeus-receipt-store.js";
import { fetchPublicReceipt } from "../lib/aculeus-receipt-fetcher.js";
import {
  reviewCandidateAnnotation,
  reviewCandidateDeferral,
  reviewCandidatePromotion,
  reviewCandidateRejection,
  reviewRecordRequest,
  validateReviewerActionResult
} from "../lib/aculeus-reviewer-actions.js";

const failures = [];
const receiptStoreDir = mkdtempSync(join(tmpdir(), "aculeus-reviewer-receipts-"));
const receiptStore = createFileReceiptStore(receiptStoreDir);
const body = "Official public record. Contract A-123 approved $123,456 for supportive housing services. No adjudication of fraud appears here.";
const fixtureServer = createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
});

function listen(server, port = 0) {
  return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(fn, attempts = 40, delay = 150) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(delay);
    }
  }
  throw lastError;
}

try {
  await listen(fixtureServer);
  process.env.ACULEUS_ALLOW_LOCAL_RECEIPT_TESTS = "1";
  const fixturePort = fixtureServer.address().port;
  const candidate = {
    candidate_id: "review_candidate_fixture",
    url: `http://127.0.0.1:${fixturePort}/record.txt`,
    title: "Official public record fixture",
    source_family: "official_api_record_candidate",
    promotion_status: "candidate_lead_not_evidence",
    evidence_id: null
  };
  const receipt = await fetchPublicReceipt({ sourceId: candidate.candidate_id, url: candidate.url }, { store: receiptStore, maxBytes: 32000 });
  const stored = receiptStore.getReceipt(receipt.receipt_id);

  const promoted = reviewCandidatePromotion({
    candidate,
    receipt: stored,
    receiptText: stored.raw_text,
    quote: "Contract A-123 approved $123,456 for supportive housing services.",
    claim: "Contract A-123 approved $123,456 for supportive housing services.",
    reviewer: "unit_test_reviewer",
    promoted_at: "2026-05-16T12:00:00.000Z"
  });
  failures.push(...validateReviewerActionResult(promoted));
  if (promoted.status !== "source_promoted_to_evidence" || promoted.finding_promotion_allowed !== true) failures.push("valid reviewer promotion did not pass");
  if (promoted.candidate_update.evidence_id !== promoted.evidence_record.evidence_id) failures.push("candidate update did not reference promoted evidence");

  const highRisk = reviewCandidatePromotion({
    candidate,
    receipt: stored,
    receiptText: stored.raw_text,
    quote: "Contract A-123 approved $123,456 for supportive housing services.",
    claim: "Fraud occurred in Contract A-123.",
    reviewer: "unit_test_reviewer"
  });
  failures.push(...validateReviewerActionResult(highRisk));
  if (highRisk.status !== "source_promoted_to_evidence" || highRisk.finding_promotion_allowed !== false || highRisk.high_risk_finding_blocked !== true) {
    failures.push("high-risk reviewer action should only promote source, not finding");
  }

  const missingQuote = reviewCandidatePromotion({
    candidate,
    receipt: stored,
    receiptText: stored.raw_text,
    quote: "This quote is absent.",
    claim: "Unsupported claim."
  });
  failures.push(...validateReviewerActionResult(missingQuote));
  if (missingQuote.status !== "blocked" || missingQuote.evidence_record !== null) failures.push("missing quote should block reviewer promotion");

  const rejected = reviewCandidateRejection({ candidate, reason: "Duplicate or weak locator.", reviewer: "unit_test_reviewer" });
  failures.push(...validateReviewerActionResult(rejected));
  if (rejected.candidate_update.evidence_id !== null) failures.push("rejected candidate should not carry evidence id");
  const deferred = reviewCandidateDeferral({ candidate, reviewer: "unit_test_reviewer" });
  failures.push(...validateReviewerActionResult(deferred));
  if (deferred.status !== "candidate_deferred") failures.push("defer action should emit candidate_deferred");
  const annotated = reviewCandidateAnnotation({ candidate, note: "Needs a receipt.", reviewer: "unit_test_reviewer" });
  failures.push(...validateReviewerActionResult(annotated));
  if (annotated.status !== "candidate_annotated") failures.push("annotate action should emit candidate_annotated");
  const recordRequest = reviewRecordRequest({ candidate, request: "Request board agenda packet.", reviewer: "unit_test_reviewer" });
  failures.push(...validateReviewerActionResult(recordRequest));
  if (recordRequest.status !== "missing_record_requested" || recordRequest.missing_record_task?.status !== "needs_public_records_request") {
    failures.push("request-record action should create missing record task");
  }

  const port = 4396;
  const appServer = spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      ACULEUS_RECEIPT_STORE_DIR: receiptStoreDir
    },
    stdio: "ignore"
  });
  try {
    await retry(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/source-fed.html`);
      if (!response.ok) throw new Error(`server not ready: ${response.status}`);
    });
    const apiResponse = await fetch(`http://127.0.0.1:${port}/api/reviewer-actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "promote_candidate_source",
        candidate,
        receipt_id: stored.receipt_id,
        quote: "Contract A-123 approved $123,456 for supportive housing services.",
        claim: "Contract A-123 approved $123,456 for supportive housing services.",
        reviewer: "api_test_reviewer"
      })
    });
    if (!apiResponse.ok) failures.push(`reviewer action API returned ${apiResponse.status}`);
    const apiResult = await apiResponse.json();
    failures.push(...validateReviewerActionResult(apiResult).map((issue) => `api: ${issue}`));
    if (JSON.stringify(apiResult).includes("raw_text") || JSON.stringify(apiResult).includes(body)) failures.push("reviewer action API leaked receipt raw text");
  } finally {
    appServer.kill();
    await sleep(250);
  }
} finally {
  await close(fixtureServer);
  rmSync(receiptStoreDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`Reviewer action verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Reviewer action verification passed.");
