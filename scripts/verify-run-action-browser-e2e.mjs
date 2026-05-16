import { createServer } from "node:http";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const port = Number(process.env.ACULEUS_RUN_ACTION_E2E_PORT || 4533);
const fixtureServer = createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end("Official run action browser E2E receipt. Board approved Example Services for $42,000. No fraud or intent finding is made here.");
});
await new Promise((resolve) => fixtureServer.listen(0, "127.0.0.1", resolve));
const fixtureUrl = `http://127.0.0.1:${fixtureServer.address().port}/receipt.txt`;

const storeDir = mkdtempSync(join(tmpdir(), "aculeus-run-action-e2e-store-"));
const receiptDir = mkdtempSync(join(tmpdir(), "aculeus-run-action-e2e-receipts-"));
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const command = existsSync(join(process.cwd(), ".next", "BUILD_ID")) ? "start" : "dev";
const child = spawn(process.execPath, [nextBin, command, "-p", String(port), "-H", "127.0.0.1"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ACULEUS_AUTH_MODE: "production",
    ACULEUS_TRUST_SMOKE_HEADERS: "1",
    ACULEUS_PRODUCT_STORE_DIR: storeDir,
    ACULEUS_RECEIPT_STORE_DIR: receiptDir,
    ACULEUS_ALLOW_LOCAL_RECEIPT_TESTS: "1",
    BROWSERBASE_API_KEY: ""
  },
  stdio: "ignore",
  windowsHide: true
});

let browser = null;
try {
  await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    if (!response.ok) throw new Error(`Next ${command} server not ready: ${response.status}`);
  }, 120, 300);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-clerk-user-id": "run_action_e2e",
      "x-aculeus-email": "run-action-e2e@aculeus.local",
      "x-aculeus-role": "admin",
      "x-aculeus-approval-status": "approved"
    }
  });
  const base = `http://127.0.0.1:${port}`;
  const run = await postJson(context, `${base}/api/runs/start`, {
    lead: "Run action browser E2E",
    caseId: "case_run_action_e2e"
  });
  const runId = run.run?.runId;
  if (!runId) throw new Error("run action E2E missing run id");

  const candidate = {
    candidate_id: "candidate_run_action_e2e",
    source_id: "source_run_action_e2e",
    url: fixtureUrl,
    title: "Run action receipt fixture",
    snippet: "Board approved Example Services for $42,000.",
    candidate_reason: "Receipt-backed public source fixture.",
    evidence_id: null,
    evidence_promotion_allowed: false,
    receipt_required: true
  };
  const receipt = await postJson(context, `${base}/api/receipt-fetch`, {
    runId,
    candidate,
    quote: candidate.snippet,
    claim: "Board approved Example Services for $42,000.",
    enableBrowserbase: false
  });
  if (!receipt.receipt?.receipt_id || receipt.receipt?.raw_text) throw new Error(`receipt fetch failed or leaked raw text: ${JSON.stringify(receipt).slice(0, 500)}`);

  const review = await postJson(context, `${base}/api/reviewer-actions`, {
    runId,
    action: "promote_candidate_source",
    candidate,
    receipt_id: receipt.receipt.receipt_id,
    quote: candidate.snippet,
    claim: "Board approved Example Services for $42,000.",
    reviewer: "browser_e2e"
  });
  if (review.status !== "source_promoted_to_evidence" || !review.evidence_record?.evidence_id) {
    throw new Error(`reviewer action did not promote source-level receipt: ${JSON.stringify(review).slice(0, 500)}`);
  }

  const retryResult = await postJson(context, `${base}/api/runs/${runId}/retry`, {
    reason: "browser e2e retry",
    taskId: "receipt_fetch_retry"
  });
  if (retryResult.ledger_entry?.status !== "retry_queued") throw new Error("retry did not emit retry ledger row");

  const feedback = await postJson(context, `${base}/api/runs/${runId}/feedback`, { type: "saved_or_exported" });
  if (!feedback.ok || feedback.feedback?.training_conversion_allowed !== false) throw new Error("feedback route failed or escaped offline gate");

  const cancel = await postJson(context, `${base}/api/runs/${runId}/cancel`, { reason: "browser e2e cancel" });
  if (cancel.run?.lifecycle?.state !== "cancelled") throw new Error("cancel did not terminate run");

  const board = await getJson(context, `${base}/api/runs/${runId}/case-board`);
  const ledgerTypes = (board.caseBoard?.sourceLedger || []).map((entry) => entry.entry_type);
  for (const type of ["receipt_fetch", "reviewer_action", "task_retry", "user_feedback", "run_cancelled"]) {
    if (!ledgerTypes.includes(type)) throw new Error(`case board missing ledger type ${type}`);
  }
  console.log("Run action browser E2E verification passed.");
} finally {
  await browser?.close?.().catch(() => null);
  child.kill();
  fixtureServer.close();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
  rmSync(receiptDir, { recursive: true, force: true });
}

async function postJson(context, url, body) {
  const response = await context.request.post(url, { data: body });
  const json = await response.json();
  if (!response.ok()) throw new Error(`${url} returned ${response.status()}: ${JSON.stringify(json).slice(0, 500)}`);
  return json;
}

async function getJson(context, url) {
  const response = await context.request.get(url);
  const json = await response.json();
  if (!response.ok()) throw new Error(`${url} returned ${response.status()}: ${JSON.stringify(json).slice(0, 500)}`);
  return json;
}

async function retry(fn, attempts, delay) {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
